import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { ScanDeliverDto } from './dto/scan-deliver.dto';
import {
  OrderStatus,
  CourierStatus,
  EarningStatus,
  AccountType,
} from '@prisma/client';

@Injectable()
export class CourierAppService {
  private readonly logger = new Logger(CourierAppService.name);

  constructor(
    private prisma: PrismaService,
    private qrService: QrService,
    private trackingWs: TrackingGateway,
    private notifications: NotificationsService,
  ) {}

  // ══════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════
  async getMe(courierId: string) {
    const c = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        regionId: true,
        branchId: true,
        vehicleType: true,
        vehiclePlate: true,
        vehicleModel: true,
        vehicleColor: true,
        status: true,
        isActive: true,
        phoneVerified: true,
        rating: true,
        totalDeliveries: true,
        totalFailed: true,
        isOnline: true,
        currentLat: true,
        currentLng: true,
        lastSeenAt: true,
        createdAt: true,
        region: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });
    if (!c) throw new NotFoundException('Courier not found');
    return c;
  }

  async updateMe(courierId: string, dto: UpdateCourierProfileDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.vehiclePlate !== undefined) data.vehiclePlate = dto.vehiclePlate;
    if (dto.vehicleModel !== undefined) data.vehicleModel = dto.vehicleModel;
    if (dto.vehicleColor !== undefined) data.vehicleColor = dto.vehicleColor;

    return this.prisma.courier.update({
      where: { id: courierId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        vehiclePlate: true,
        vehicleModel: true,
        vehicleColor: true,
        updatedAt: true,
      },
    });
  }

  // ══════════════════════════════════════════════════
  // ONLINE / OFFLINE
  // ══════════════════════════════════════════════════
  async goOnline(courierId: string, lat?: number, lng?: number) {
    if (
      lat != null &&
      lng != null &&
      (lat < 3.4 || lat > 14.9 || lng < 32.9 || lng > 48.0)
    ) {
      throw new BadRequestException('Coordinates outside Ethiopia');
    }

    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
    });
    if (!courier) throw new NotFoundException('Courier not found');
    if (courier.status !== CourierStatus.APPROVED) {
      throw new ForbiddenException('Courier not approved');
    }

    return this.prisma.courier.update({
      where: { id: courierId },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
        ...(lat != null && lng != null
          ? { currentLat: lat, currentLng: lng }
          : {}),
      },
      select: { isOnline: true, lastSeenAt: true, currentLat: true, currentLng: true },
    });
  }

  async goOffline(courierId: string) {
    return this.prisma.courier.update({
      where: { id: courierId },
      data: { isOnline: false },
      select: { isOnline: true },
    });
  }

  async updateLocation(courierId: string, dto: UpdateCourierLocationDto) {
    if (dto.lat < 3.4 || dto.lat > 14.9 || dto.lng < 32.9 || dto.lng > 48.0) {
      throw new BadRequestException('Coordinates outside Ethiopia');
    }

    const updated = await this.prisma.courier.update({
      where: { id: courierId },
      data: {
        currentLat: dto.lat,
        currentLng: dto.lng,
        lastSeenAt: new Date(),
        isOnline: true,
      },
      select: { currentLat: true, currentLng: true, lastSeenAt: true },
    });

    return { ...updated, lat: updated.currentLat, lng: updated.currentLng };
  }

  // ══════════════════════════════════════════════════
  // JOBS
  // ══════════════════════════════════════════════════
  async listJobs(
    courierId: string,
    status: 'active' | 'completed' | 'all' = 'active',
    page = 1,
    limit = 20,
  ) {
    const where: any = { courierId };

    const activeStatuses: OrderStatus[] = [
      OrderStatus.ASSIGNED,
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
      OrderStatus.OUT_FOR_DELIVERY,
    ];
    const completedStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.FAILED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
    ];

    if (status === 'active') where.status = { in: activeStatuses };
    else if (status === 'completed') where.status = { in: completedStatuses };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          originBranch: { select: { id: true, name: true, code: true } },
          destBranch: { select: { id: true, name: true, code: true } },
          courier: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => this.publicJob(o)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getJob(courierId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, courierId },
      include: {
        items: true,
        originBranch: { select: { id: true, name: true, code: true } },
        destBranch: { select: { id: true, name: true, code: true } },
        courier: { select: { id: true, name: true, phone: true } },
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        payments: true,
      },
    });
    if (!order) throw new NotFoundException('Job not found');
    return this.publicJob(order, true);
  }

  async getStats(courierId: string) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const [todayAssigned, todayCompleted, todayEarnings, courier] =
      await Promise.all([
        this.prisma.order.count({
          where: {
            courierId,
            assignedAt: { gte: startOfDay },
          },
        }),
        this.prisma.order.count({
          where: {
            courierId,
            status: OrderStatus.DELIVERED,
            deliveredAt: { gte: startOfDay },
          },
        }),
        this.prisma.courierEarning.aggregate({
          where: {
            courierId,
            createdAt: { gte: startOfDay },
          },
          _sum: { amount: true },
        }),
        this.prisma.courier.findUnique({
          where: { id: courierId },
          select: {
            rating: true,
            totalDeliveries: true,
            totalFailed: true,
          },
        }),
      ]);

    return {
      today: {
        assigned: todayAssigned,
        completed: todayCompleted,
        inProgress: todayAssigned - todayCompleted,
        earnings: todayEarnings._sum.amount ?? 0,
      },
      allTime: {
        totalDeliveries: courier?.totalDeliveries ?? 0,
        totalFailed: courier?.totalFailed ?? 0,
        rating: courier?.rating ?? 5.0,
      },
    };
  }

  // ══════════════════════════════════════════════════
  // EARNINGS
  // ══════════════════════════════════════════════════
  async listEarnings(
    courierId: string,
    status?: EarningStatus,
    page = 1,
    limit = 20,
  ) {
    const where: any = { courierId };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.courierEarning.findMany({
        where,
        include: {
          order: {
            select: {
              trackingNumber: true,
              deliveryFee: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.courierEarning.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getEarningsSummary(courierId: string) {
    const [pending, released, paid] = await Promise.all([
      this.prisma.courierEarning.aggregate({
        where: { courierId, status: EarningStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.courierEarning.aggregate({
        where: { courierId, status: EarningStatus.RELEASED },
        _sum: { amount: true },
      }),
      this.prisma.courierEarning.aggregate({
        where: { courierId, status: EarningStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending: pending._sum.amount ?? 0,
      released: released._sum.amount ?? 0,
      paid: paid._sum.amount ?? 0,
      currency: 'ETB',
    };
  }

  // ══════════════════════════════════════════════════
  // QR CODE SCANNING & REASSIGNMENT
  // ══════════════════════════════════════════════════

  /**
   * Resolve an order from any QR code representation:
   * - Full QR URL (e.g. http://localhost:5173/q/ETH-2026-A1B2C3?s=6a1f2b)
   * - Tracking URL (e.g. https://deliver.et/t/32hexToken?s=6a1f2b)
   * - Direct tracking number (e.g. ETH-2026-A1B2C3)
   * - Tracking number with signature (e.g. ETH-2026-A1B2C3?s=6a1f2b)
   * - Order ID
   * - JSON payload
   */
  async resolveOrderFromScan(input: {
    code?: string;
    orderId?: string;
    signature?: string;
  }) {
    const raw = (input.code ?? input.orderId ?? '').trim();
    if (!raw) {
      throw new BadRequestException(
        'QR code content, tracking number, or order ID is required',
      );
    }

    let trackingNumber: string | undefined;
    let trackingToken: string | undefined;
    let signature = input.signature;
    let orderId = input.orderId;

    // 1. Try URL parsing
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('/')
    ) {
      try {
        const url = new URL(raw, 'https://dummy.local');
        if (!signature && url.searchParams.get('s')) {
          signature = url.searchParams.get('s')!;
        }

        const pathname = url.pathname;
        const qMatch = pathname.match(/\/q\/([^/?#]+)/i);
        if (qMatch) {
          trackingNumber = decodeURIComponent(qMatch[1]);
        }

        const tMatch = pathname.match(/\/(?:t|track)\/([^/?#]+)/i);
        if (tMatch) {
          trackingToken = decodeURIComponent(tMatch[1]);
        }

        const oMatch = pathname.match(/\/orders\/([^/?#]+)/i);
        if (oMatch) {
          orderId = decodeURIComponent(oMatch[1]);
        }
      } catch {
        // Fall back to string parsing
      }
    }

    // 2. Try JSON parsing
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.trackingNumber) trackingNumber = parsed.trackingNumber;
        if (parsed.trackingToken) trackingToken = parsed.trackingToken;
        if (parsed.id) orderId = parsed.id;
        if (parsed.signature && !signature) signature = parsed.signature;
      } catch {
        // Ignore
      }
    }

    // 3. Inline signature "ETH-2026-XXXX?s=abcdef"
    if (!trackingNumber && raw.includes('?s=')) {
      const [part1, part2] = raw.split('?s=');
      trackingNumber = part1.trim();
      if (!signature) signature = part2.trim();
    }

    // 4. Query DB for matching order
    const candidates: any[] = [];
    if (orderId) candidates.push({ id: orderId });
    if (trackingNumber) candidates.push({ trackingNumber });
    if (trackingToken) candidates.push({ trackingToken });

    // Raw fallbacks
    candidates.push({ trackingNumber: raw });
    candidates.push({ id: raw });
    candidates.push({ trackingToken: raw });
    candidates.push({ qrCodePayload: raw });
    candidates.push({ trackingUrl: raw });

    const order = await this.prisma.order.findFirst({
      where: {
        OR: candidates,
      },
      include: {
        items: true,
        originBranch: { select: { id: true, name: true, code: true } },
        destBranch: { select: { id: true, name: true, code: true } },
        courier: { select: { id: true, name: true, phone: true } },
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found for scanned code: ${raw}`);
    }

    // 5. Signature verification if signature was passed / in QR
    if (signature) {
      const isQrValid =
        (order.qrCodeSignature && order.qrCodeSignature === signature) ||
        this.qrService.verifySignature(order.trackingNumber, signature, 'qr');
      const isTrackingValid = order.trackingToken
        ? this.qrService.verifySignature(
            order.trackingToken,
            signature,
            'tracking',
          )
        : false;

      if (!isQrValid && !isTrackingValid) {
        throw new BadRequestException('Invalid QR signature');
      }
    }

    return order;
  }

  /**
   * Courier scans QR code on an order.
   * If the order is NOT assigned (or already assigned to another courier),
   * the system assigns / reassigns the order to THIS scanning courier.
   *
   * Action can be 'assign' (default) or 'pickup' (sets status to PICKED_UP).
   */
  async scanOrder(
    courierId: string,
    dto: ScanQrDto,
    orderIdParam?: string,
  ) {
    // 1. Validate scanning courier
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
    });
    if (!courier) throw new NotFoundException('Courier not found');
    if (courier.status !== CourierStatus.APPROVED) {
      throw new ForbiddenException(
        `Courier account is not approved (${courier.status})`,
      );
    }
    if (!courier.isActive) {
      throw new ForbiddenException('Courier account is inactive or suspended');
    }

    // 2. Resolve target order
    const rawCode = dto.code || dto.qrPayload || dto.trackingNumber;
    const order = await this.resolveOrderFromScan({
      code: rawCode,
      orderId: orderIdParam,
      signature: dto.signature,
    });

    // 3. Block terminal states
    const BLOCKED_STATUSES: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
    ];
    if (BLOCKED_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Cannot scan order: it has already been ${order.status.toLowerCase().replace(/_/g, ' ')}`,
      );
    }

    // 4. Capacity & special handling checks
    if (courier.maxWeightKg != null && order.totalWeightKg > courier.maxWeightKg) {
      throw new BadRequestException(
        `Order weight (${order.totalWeightKg} kg) exceeds your vehicle capacity (${courier.maxWeightKg} kg)`,
      );
    }
    if (order.isFragile && !courier.handlesFragile) {
      throw new BadRequestException(
        'Order contains fragile items that your vehicle profile does not handle',
      );
    }
    if (order.isRefrigerated && !courier.handlesRefrigerated) {
      throw new BadRequestException(
        'Order requires refrigerated transport that your vehicle profile does not handle',
      );
    }

    // 5. Update courier GPS location if provided
    if (dto.lat != null && dto.lng != null) {
      await this.prisma.courier.update({
        where: { id: courierId },
        data: {
          currentLat: dto.lat,
          currentLng: dto.lng,
          lastSeenAt: new Date(),
          isOnline: true,
        },
      });
    }

    // 6. Assignment / Reassignment determination
    const isAlreadyAssignedToMe = order.courierId === courier.id;
    const wasAssignedToOther =
      order.courierId != null && !isAlreadyAssignedToMe;
    const wasUnassigned = order.courierId == null;
    const previousCourier = order.courier;

    const isPickupAction = dto.action === 'pickup';
    let targetStatus = order.status;

    if (isPickupAction) {
      targetStatus = OrderStatus.PICKED_UP;
    } else if (
      order.status !== OrderStatus.PICKED_UP &&
      order.status !== OrderStatus.IN_TRANSIT &&
      order.status !== OrderStatus.OUT_FOR_DELIVERY
    ) {
      targetStatus = OrderStatus.ASSIGNED;
    }

    // 7. Atomic database update
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {
        courierId: courier.id,
        status: targetStatus,
        assignedAt: order.assignedAt ?? new Date(),
        autoUnassignAt: null,
        unassignReason: null,
      };

      if (wasAssignedToOther || wasUnassigned) {
        dataToUpdate.assignedAt = new Date();
      }

      if (isPickupAction) {
        dataToUpdate.pickedUpAt = new Date();
      }

      if (dto.lat != null && dto.lng != null) {
        dataToUpdate.lastCourierLat = dto.lat;
        dataToUpdate.lastCourierLng = dto.lng;
        dataToUpdate.lastTrackedAt = new Date();
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: dataToUpdate,
        include: {
          items: true,
          originBranch: { select: { id: true, name: true, code: true } },
          destBranch: { select: { id: true, name: true, code: true } },
          courier: { select: { id: true, name: true, phone: true } },
          events: {
            where: { isPublic: true },
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
          payments: true,
        },
      });

      // Create OrderEvent
      let note = '';
      if (wasAssignedToOther) {
        note = isPickupAction
          ? `Order reassigned from ${previousCourier?.name ?? 'previous courier'} to ${courier.name} and picked up via QR scan`
          : `Order reassigned from ${previousCourier?.name ?? 'previous courier'} to courier ${courier.name} via QR scan`;
      } else if (wasUnassigned) {
        note = isPickupAction
          ? `Order assigned to courier ${courier.name} and picked up via QR scan`
          : `Order assigned to courier ${courier.name} via QR scan`;
      } else {
        note = isPickupAction
          ? `Package picked up by courier ${courier.name} via QR scan`
          : `Order verified via QR scan by courier ${courier.name}`;
      }

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: targetStatus,
          note,
          actorType: AccountType.COURIER,
          actorId: courier.id,
          actorName: courier.name,
          isPublic: true,
          location:
            dto.lat != null && dto.lng != null
              ? `${dto.lat},${dto.lng}`
              : null,
          lat: dto.lat,
          lng: dto.lng,
        },
      });

      // Cancel pending earnings for previous courier if reassigned
      if (wasAssignedToOther && previousCourier) {
        await tx.courierEarning.updateMany({
          where: {
            orderId: order.id,
            courierId: previousCourier.id,
            status: EarningStatus.PENDING,
          },
          data: { status: EarningStatus.CANCELLED },
        });
      }

      // Create / activate CourierEarning for new courier
      if (order.courierEarning > 0) {
        const myEarning = await tx.courierEarning.findFirst({
          where: { orderId: order.id, courierId: courier.id },
        });

        if (!myEarning) {
          await tx.courierEarning.create({
            data: {
              courierId: courier.id,
              orderId: order.id,
              amount: order.courierEarning,
              currency: 'ETB',
              type: 'DELIVERY',
              status: EarningStatus.PENDING,
            },
          });
        } else if (myEarning.status === EarningStatus.CANCELLED) {
          await tx.courierEarning.update({
            where: { id: myEarning.id },
            data: { status: EarningStatus.PENDING },
          });
        }
      }

      // Clean up order offers
      await tx.orderOffer.updateMany({
        where: { orderId: order.id, courierId: courier.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
      await tx.orderOffer.updateMany({
        where: {
          orderId: order.id,
          courierId: { not: courier.id },
          status: 'PENDING',
        },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });

      return updated;
    });

    // 8. Notifications and Live WebSocket Updates
    try {
      // Notify previous courier if reassigned
      if (wasAssignedToOther && previousCourier) {
        this.trackingWs.server
          ?.to(`courier:${previousCourier.id}`)
          ?.emit('order:reassigned', {
            orderId: order.id,
            trackingNumber: order.trackingNumber,
            newCourierName: courier.name,
          });

        await this.notifications.sendToCourier(previousCourier.id, {
          title: 'Order Reassigned',
          body: `Order #${order.trackingNumber} has been reassigned to courier ${courier.name}.`,
          data: {
            type: 'ORDER_REASSIGNED',
            orderId: order.id,
            trackingNumber: order.trackingNumber,
          },
        });
      }

      // WebSocket status broadcast to tracking room
      this.trackingWs.broadcastStatusChange(order.id, {
        status: targetStatus,
        note: wasAssignedToOther
          ? `Reassigned to courier ${courier.name}`
          : wasUnassigned
          ? `Assigned to courier ${courier.name}`
          : `Verified by courier ${courier.name}`,
        lat: dto.lat,
        lng: dto.lng,
        timestamp: new Date().toISOString(),
      });
      this.trackingWs.emitStatus(order.trackingNumber, targetStatus);

      // Customer push/SMS notification
      await this.notifications.notifyOrderStatus(updatedOrder);

      // Notify scanning courier's socket
      this.trackingWs.server
        ?.to(`courier:${courier.id}`)
        ?.emit('order:assigned', {
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          order: this.publicJob(updatedOrder, true),
        });
    } catch (err: any) {
      this.logger.warn(`Post-scan notification error: ${err.message}`);
    }

    const message = wasAssignedToOther
      ? `Order #${order.trackingNumber} reassigned to you from ${previousCourier?.name ?? 'previous courier'}`
      : wasUnassigned
      ? `Order #${order.trackingNumber} assigned to you successfully`
      : `Order #${order.trackingNumber} verified`;

    const formattedJob = this.publicJob(updatedOrder, true);

    return {
      success: true,
      message,
      reassigned: wasAssignedToOther || wasUnassigned,
      wasUnassigned,
      wasReassignedFromOther: wasAssignedToOther,
      previousCourier: previousCourier
        ? { id: previousCourier.id, name: previousCourier.name }
        : null,
      status: targetStatus,
      order: formattedJob,
      job: formattedJob,
      data: formattedJob,
    };
  }

  /**
   * Courier scans QR code at delivery destination to confirm delivery.
   * Releases earnings and marks order DELIVERED.
   */
  async scanDeliver(
    courierId: string,
    orderIdParam: string,
    dto: ScanDeliverDto,
  ) {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
    });
    if (!courier) throw new NotFoundException('Courier not found');
    if (courier.status !== CourierStatus.APPROVED || !courier.isActive) {
      throw new ForbiddenException('Courier is not approved or inactive');
    }

    const order = await this.resolveOrderFromScan({
      code: dto.code,
      orderId: orderIdParam,
      signature: dto.signature,
    });

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Order has already been marked as delivered');
    }
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RETURNED
    ) {
      throw new BadRequestException(
        `Cannot deliver a ${order.status.toLowerCase()} order`,
      );
    }

    // If order was somehow not assigned to this courier, reassign on delivery
    const wasAssignedToOther =
      order.courierId != null && order.courierId !== courier.id;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          courierId: courier.id,
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
          receiverConfirmed: dto.receiverConfirmed ?? true,
          ...(dto.deliveryOtp ? { deliveryOtp: dto.deliveryOtp } : {}),
          ...(dto.deliveryPhotoUrl
            ? { deliveryPhotoUrl: dto.deliveryPhotoUrl }
            : {}),
          ...(dto.deliverySignatureUrl
            ? { deliverySignatureUrl: dto.deliverySignatureUrl }
            : {}),
          ...(dto.lat != null && dto.lng != null
            ? {
                lastCourierLat: dto.lat,
                lastCourierLng: dto.lng,
                lastTrackedAt: new Date(),
              }
            : {}),
        },
        include: {
          items: true,
          originBranch: { select: { id: true, name: true, code: true } },
          destBranch: { select: { id: true, name: true, code: true } },
          courier: { select: { id: true, name: true, phone: true } },
          events: {
            where: { isPublic: true },
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
          payments: true,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: OrderStatus.DELIVERED,
          note: `Delivered by courier ${courier.name} via QR scan confirmation`,
          actorType: AccountType.COURIER,
          actorId: courier.id,
          actorName: courier.name,
          isPublic: true,
          location:
            dto.lat != null && dto.lng != null
              ? `${dto.lat},${dto.lng}`
              : null,
          lat: dto.lat,
          lng: dto.lng,
        },
      });

      // Release earnings for this courier
      if (order.courierEarning > 0) {
        const myEarning = await tx.courierEarning.findFirst({
          where: { orderId: order.id, courierId: courier.id },
        });

        if (myEarning) {
          await tx.courierEarning.update({
            where: { id: myEarning.id },
            data: {
              status: EarningStatus.RELEASED,
              releasedAt: new Date(),
            },
          });
        } else {
          await tx.courierEarning.create({
            data: {
              courierId: courier.id,
              orderId: order.id,
              amount: order.courierEarning,
              currency: 'ETB',
              type: 'DELIVERY',
              status: EarningStatus.RELEASED,
              releasedAt: new Date(),
            },
          });
        }
      }

      // If reassigned on delivery, cancel previous courier's pending earning
      if (wasAssignedToOther && order.courierId) {
        await tx.courierEarning.updateMany({
          where: {
            orderId: order.id,
            courierId: order.courierId,
            status: EarningStatus.PENDING,
          },
          data: { status: EarningStatus.CANCELLED },
        });
      }

      // Increment completed deliveries counter for courier
      await tx.courier.update({
        where: { id: courier.id },
        data: {
          totalDeliveries: { increment: 1 },
          ...(dto.lat != null && dto.lng != null
            ? {
                currentLat: dto.lat,
                currentLng: dto.lng,
                lastSeenAt: new Date(),
              }
            : {}),
        },
      });

      return updated;
    });

    try {
      this.trackingWs.broadcastStatusChange(order.id, {
        status: OrderStatus.DELIVERED,
        note: `Delivered by courier ${courier.name}`,
        lat: dto.lat,
        lng: dto.lng,
        timestamp: new Date().toISOString(),
      });
      this.trackingWs.emitStatus(order.trackingNumber, OrderStatus.DELIVERED);
      this.trackingWs.broadcastOrderEnd(order.id, {
        outcome: 'DELIVERED',
        message: `Order #${order.trackingNumber} successfully delivered by ${courier.name}`,
      });
      await this.notifications.notifyOrderStatus(updatedOrder);
    } catch (err: any) {
      this.logger.warn(`Post-delivery notification error: ${err.message}`);
    }

    const formattedJob = this.publicJob(updatedOrder, true);
    return {
      success: true,
      message: `Order #${order.trackingNumber} successfully marked delivered`,
      order: formattedJob,
      job: formattedJob,
      data: formattedJob,
    };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════
  private publicJob(order: any, detailed = false) {
    const base: any = {
      id: order.id,
      trackingNumber: order.trackingNumber,
      status: order.status,
      senderName: order.senderName,
      senderPhone: order.senderPhone,
      senderAddress: order.senderAddress,
      senderLat: order.senderLat,
      senderLng: order.senderLng,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      receiverLat: order.receiverLat,
      receiverLng: order.receiverLng,
      distanceKm: order.distanceKm,
      totalWeightKg: order.totalWeightKg,
      isFragile: order.isFragile,
      isRefrigerated: order.isRefrigerated,
      courierEarning: order.courierEarning,
      paymentParty: order.paymentParty,
      codAmount: order.codAmount,
      items: (order.items ?? []).map((it: any) => ({
        id: it.id,
        type: it.type,
        description: it.description,
        quantity: it.quantity,
        weightKg: it.weightKg,
      })),
      assignedAt: order.assignedAt,
      pickedUpAt: order.pickedUpAt,
      deliveredAt: order.deliveredAt,
      estimatedArrival: order.estimatedArrival,
    };

    if (order.originBranch) {
      base.originBranch = {
        id: order.originBranch.id,
        name: order.originBranch.name,
        code: order.originBranch.code,
      };
    }
    if (order.destBranch) {
      base.destBranch = {
        id: order.destBranch.id,
        name: order.destBranch.name,
        code: order.destBranch.code,
      };
    }
    if (order.courier) {
      base.courier = {
        id: order.courier.id,
        name: order.courier.name,
        phone: order.courier.phone,
      };
    }

    if (detailed) {
      base.events = order.events ?? [];
      base.payments = order.payments ?? [];
    }

    return base;
  }
}
