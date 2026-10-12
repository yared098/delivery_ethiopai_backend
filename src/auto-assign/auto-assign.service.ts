import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferStoreService } from './offer-store.service';
import {
  analyzeRoute,
  getOfferConfig,
  getMaxConcurrent,
  haversine,
  RouteInfo,
} from './route-utils';
import { Order, Courier } from '@prisma/client';

const STALE_LOCATION_MIN = 5;
const NO_SHOW_MINUTES = 15;

@Injectable()
export class AutoAssignService {
  private readonly logger = new Logger(AutoAssignService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: TrackingGateway,
    private notifications: NotificationsService,
    private offerStore: OfferStoreService,
  ) {}

  /**
   * Main entry point. Called when order status becomes PAID.
   */
  async tryAutoAssign(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { originBranch: true, destBranch: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PAID' || order.courierId) {
      this.logger.debug(`Skipping ${orderId} — status: ${order.status}`);
      return;
    }

    const route = analyzeRoute(order);
    const config = getOfferConfig(route.category);

    // Persist route info to order
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        routeCategory: route.category,
        routeDistanceKm: route.distanceKm,
      },
    });

    // Check retry budget
    const attempts = await this.offerStore.getAttempts(orderId);
    if (attempts >= config.maxRetries) {
      await this.escalateToManual(orderId, `Max retries (${config.maxRetries}) reached`);
      return;
    }

    // Find candidates
    const candidates = await this.findCandidates(order, route);

    if (candidates.length === 0) {
      await this.escalateToManual(orderId, 'No eligible couriers');
      return;
    }

    // Take top N
    const top = candidates.slice(0, config.broadcastSize);
    const attemptNo = await this.offerStore.incrementAttempt(orderId);

    // Persist offers to DB
    await this.prisma.orderOffer.createMany({
      data: top.map((c) => ({
        orderId,
        courierId: c.id,
        attemptNo,
        expiresAt: new Date(Date.now() + config.timeoutMs),
        pickupKm: c.pickupDistanceKm,
        routeKm: route.distanceKm,
        status: 'PENDING' as const,
      })),
      skipDuplicates: true,
    });

    // Track in Redis
    await this.offerStore.saveOfferedCouriers(
      orderId,
      top.map((c) => c.id),
    );

    // Update order
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        autoAssignAttempts: attemptNo,
        lastOfferedAt: new Date(),
      },
    });

    // Send offers
    for (const courier of top) {
      await this.sendOffer(order, courier, route, config.timeoutMs);
    }

    this.logger.log(
      `Order ${order.trackingNumber} → offered to ${top.length} couriers (attempt ${attemptNo})`,
    );

    // Schedule timeout
    setTimeout(
      () =>
        this.handleOfferTimeout(orderId).catch((e) =>
          this.logger.error('Timeout handler failed', e),
        ),
      config.timeoutMs,
    );
  }

  /**
   * Find eligible couriers using route + courier service fields.
   */
  private async findCandidates(order: Order, route: RouteInfo) {
    if (!route.originRegionId) return [];

    const staleCutoff = new Date(Date.now() - STALE_LOCATION_MIN * 60_000);

    // Base filter (works for both intra + inter)
    const baseFilter: any = {
      isOnline: true,
      isActive: true,
      status: 'APPROVED',
      vehicleType: { in: route.eligibleVehicles },
      currentLat: { not: null },
      currentLng: { not: null },
      lastSeenAt: { gte: staleCutoff },
      isOnLongTrip: false,
    };

    if (order.totalWeightKg > 0) {
      baseFilter.OR = [
        { maxWeightKg: null },
        { maxWeightKg: { gte: order.totalWeightKg } },
      ];
    }
    if (order.isFragile) baseFilter.handlesFragile = true;
    if (order.isRefrigerated) baseFilter.handlesRefrigerated = true;

    // Route-specific region filter
    let regionFilter: any;

    if (route.type === 'INTRA_REGION') {
      // Same region only
      regionFilter = { regionId: route.originRegionId };
    } else {
      // Inter-region: home region OR declared service regions must include origin
      // AND destination must be in their service list
      regionFilter = {
        AND: [
          {
            OR: [
              { regionId: route.originRegionId },
              { serviceRegionIds: { has: route.originRegionId } },
            ],
          },
          {
            OR: [
              { regionId: route.deliveryRegionId! },
              { serviceRegionIds: { has: route.deliveryRegionId! } },
            ],
          },
        ],
      };
    }

    const couriers = await this.prisma.courier.findMany({
      where: { ...baseFilter, ...regionFilter },
      select: {
        id: true,
        name: true,
        phone: true,
        currentLat: true,
        currentLng: true,
        rating: true,
        totalDeliveries: true,
        maxWeightKg: true,
        vehicleType: true,
        acceptsReturnTrip: true,
      },
    });

    if (couriers.length === 0) return [];

    // Exclude overloaded
    const courierIds = couriers.map((c) => c.id);
    const activeCounts = await this.prisma.order.groupBy({
      by: ['courierId'],
      where: {
        courierId: { in: courierIds },
        status: {
          in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
        },
      },
      _count: true,
    });
    const activeMap = new Map(
      activeCounts.map((r) => [r.courierId, r._count]),
    );

    const maxConcurrent = getMaxConcurrent(route.category);

    // Filter by load + already-offered
    let filtered = couriers.filter(
      (c) => (activeMap.get(c.id) ?? 0) < maxConcurrent,
    );

    const offeredIds = await this.offerStore.getOfferedCouriers(order.id);
    filtered = filtered.filter((c) => !offeredIds.includes(c.id));

    if (filtered.length === 0) return [];

    // Score & rank
    // const pickupLat = order.senderLat ?? order.originBranch?.lat ?? 0;
    // const pickupLng = order.senderLng ?? order.originBranch?.lng ?? 0;
    const pickupLat = order.senderLat ?? 0;
    const pickupLng = order.senderLng ?? 0;

    return filtered
      .map((c) => {
        const pickupDistanceKm = haversine(
          pickupLat,
          pickupLng,
          c.currentLat!,
          c.currentLng!,
        );

        // Lighter distance weight for inter-region (they'll drive far anyway)
        const distanceWeight = route.type === 'INTRA_REGION' ? 1.0 : 0.3;

        let score = pickupDistanceKm * distanceWeight * 10;
        score += (5 - c.rating) * 5;

        // Inter-region experience bonus
        if (route.type === 'INTER_REGION' && c.totalDeliveries > 50) {
          score -= 5;
        }

        // Return-trip bonus
        if (order.requiresReturn && c.acceptsReturnTrip) {
          score -= 10;
        }

        // Near capacity penalty
        if (c.maxWeightKg && order.totalWeightKg > c.maxWeightKg * 0.8) {
          score += 15;
        }

        return { ...c, pickupDistanceKm, score };
      })
      .sort((a, b) => a.score - b.score);
  }

  /**
   * Send WebSocket + push notification to courier.
   */
  private async sendOffer(
    order: Order,
    courier: any,
    route: RouteInfo,
    timeoutMs: number,
  ) {
    const payload = {
      orderId: order.id,
      trackingNumber: order.trackingNumber,
      category: route.category,
      routeType: route.type,
      pickupDistanceKm: Math.round(courier.pickupDistanceKm * 10) / 10,
      routeDistanceKm: route.distanceKm,
    //   pickupLat: order.senderLat ?? order.originBranch?.lat,
    //   pickupLng: order.senderLng ?? order.originBranch?.lng,
    pickupLat: order.senderLat,
pickupLng: order.senderLng,
      deliveryLat: order.receiverLat,
      deliveryLng: order.receiverLng,
      weight: order.totalWeightKg,
      isFragile: order.isFragile,
      isRefrigerated: order.isRefrigerated,
      estimatedEarning: order.courierEarning,
      expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
    };

    this.gateway.server
      .to(`courier:${courier.id}`)
      .emit('order:offer', payload);

    await this.notifications.sendToCourier(courier.id, {
      title: 'New delivery nearby 🛵',
      body: `${order.trackingNumber} · ${courier.pickupDistanceKm.toFixed(1)} km away · ${order.courierEarning} ETB`,
      data: {
        type: 'ORDER_OFFER',
        orderId: order.id,
      },
    });
  }

  /**
   * Courier accepts an offer.
   */
  async acceptOffer(orderId: string, courierId: string) {
    // Atomic assignment — only one courier wins
    const result = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        courierId: null,
        status: 'PAID',
      },
      data: {
        courierId,
        assignedAt: new Date(),
        status: 'ASSIGNED',
        autoUnassignAt: new Date(Date.now() + NO_SHOW_MINUTES * 60_000),
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Order already assigned to another courier');
    }

    // Mark offer accepted
    await this.prisma.orderOffer.updateMany({
      where: { orderId, courierId, status: 'PENDING' },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });

    // Order event
    await this.prisma.orderEvent.create({
      data: {
        orderId,
        status: 'ASSIGNED',
        note: 'Courier assigned',
        actorType: 'COURIER',
        actorId: courierId,
        isPublic: true,
      },
    });

    // Cancel other offers
    const offered = await this.offerStore.getOfferedCouriers(orderId);
    const others = offered.filter((id) => id !== courierId);
    for (const otherId of others) {
      this.gateway.server
        .to(`courier:${otherId}`)
        .emit('order:offer-cancelled', { orderId });
    }

    await this.prisma.orderOffer.updateMany({
      where: {
        orderId,
        courierId: { in: others },
        status: 'PENDING',
      },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    });

    await this.offerStore.clearOffers(orderId);

    // Notify customer
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (order) {
      this.gateway.emitStatus(order.trackingNumber, 'ASSIGNED');
    }

    this.logger.log(`Order ${orderId} assigned to courier ${courierId}`);
    return { success: true };
  }

  /**
   * Courier rejects an offer.
   */
  async rejectOffer(orderId: string, courierId: string, reason?: string) {
    await this.prisma.orderOffer.updateMany({
      where: { orderId, courierId, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // If no pending offers left → retry
    const pending = await this.prisma.orderOffer.count({
      where: { orderId, status: 'PENDING' },
    });

    if (pending === 0) {
      this.logger.log(`All offers rejected for ${orderId}, retrying`);
      setTimeout(() => this.tryAutoAssign(orderId).catch(() => {}), 2000);
    }

    return { success: true };
  }

  /**
   * Timeout handler.
   */
  private async handleOfferTimeout(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.courierId) return;
    if (order.status !== 'PAID') return;

    this.logger.log(`Offer timeout for ${order.trackingNumber}`);

    await this.prisma.orderOffer.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });

    await this.tryAutoAssign(orderId);
  }

  /**
   * Escalate to admin when auto-assign fails.
   */
  private async escalateToManual(orderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    this.logger.warn(`Order ${order.trackingNumber} → MANUAL: ${reason}`);

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        status: 'PAID',
        note: `Auto-assign failed: ${reason}`,
        isPublic: false,
      },
    });

    await this.notifications.broadcastToStaff({
      title: '⚠️ Order needs manual assignment',
      body: `${order.trackingNumber} — ${reason}`,
      data: { orderId, type: 'ORDER_MANUAL_ASSIGN_NEEDED' },
    });
  }

  /**
   * Cron: detect no-shows and re-assign.
   */
  async detectNoShows() {
    const now = new Date();
    const stale = await this.prisma.order.findMany({
      where: {
        status: 'ASSIGNED',
        autoUnassignAt: { lte: now },
        pickedUpAt: null,
      },
    });

    for (const order of stale) {
      this.logger.warn(`No-show detected: ${order.trackingNumber}`);

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          courierId: null,
          status: 'PAID',
          assignedAt: null,
          autoUnassignAt: null,
          unassignReason: 'Courier did not pick up within 15 min',
        },
      });

      await this.offerStore.clearOffers(order.id);
      await this.tryAutoAssign(order.id);
    }
  }
}