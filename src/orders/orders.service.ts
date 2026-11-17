import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingNumberService } from './tracking-number.service';
import { PricingService } from './pricing.service';
import { ReceiverLinksService } from './receiver-links.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { SendReceiverLinkDto } from './dto/send-receiver-link.dto';
import { QrService } from '../qr/qr.service';
import { AfroMessageService } from '../integrations/afromessage/afromessage.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  WarehouseQueryDto,
  WarehouseHistoryQueryDto,
} from './dto/warehouse-query.dto';
import {
  AccountType,
  EarningStatus,
  OrderStatus,
  PaymentParty,
  StaffRole,
} from '@prisma/client';
import { BranchResolverService } from './branch-resolver.service';
import {
  StaffScanInDto,
  StaffScanOutDto,
  StaffScanOutAction,
} from './dto/staff-scan.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private tracking: TrackingNumberService,
    private pricing: PricingService,
    private receiverLinks: ReceiverLinksService,
    private trackingWs: TrackingGateway,
    private qr: QrService,
    private sms: AfroMessageService,
    private notifications: NotificationsService,
    private branchResolver: BranchResolverService,
  ) {}

  private orderScope(currentUser: any) {
    if (currentUser.role === StaffRole.SUPER_ADMIN) {
      return {};
    }

    if (currentUser.role === StaffRole.REGIONAL_ADMIN) {
      if (currentUser.regionId) {
        return {
          OR: [
            { originBranch: { regionId: currentUser.regionId } },
            { destBranch: { regionId: currentUser.regionId } },
          ],
        };
      }
      return {};
    }

    if (currentUser.role === StaffRole.BRANCH_MANAGER) {
      if (currentUser.branchId) {
        return {
          OR: [
            { originBranchId: currentUser.branchId },
            { destBranchId: currentUser.branchId },
          ],
        };
      }
      if (currentUser.regionId) {
        return {
          OR: [
            { originBranch: { regionId: currentUser.regionId } },
            { destBranch: { regionId: currentUser.regionId } },
          ],
        };
      }
      return {};
    }

    return { id: '__no_access__' };
  }

  private async assertOrderAccess(orderId: string, currentUser: any) {
    const order = await this.prisma.order.findFirst({
      where: { AND: [{ id: orderId }, this.orderScope(currentUser)] },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');
  }

  private async assertOriginBranchAccess(
    originBranchId: string | null,
    currentUser: any,
  ) {
    if (currentUser.accountType !== AccountType.STAFF) return;
    if (currentUser.role === StaffRole.SUPER_ADMIN) return;
    if (!originBranchId) {
      throw new BadRequestException('Staff-created orders require an origin branch');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: originBranchId },
      select: { id: true, regionId: true },
    });
    if (!branch) throw new BadRequestException('Origin branch not found');

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      branch.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only create orders in your region');
    }
    if (
      currentUser.role === StaffRole.BRANCH_MANAGER &&
      branch.id !== currentUser.branchId
    ) {
      throw new ForbiddenException('You can only create orders in your branch');
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    return '251' + digits;
  }

  private buildZeroPricingBreakdown() {
    return {
      baseFee: 0,
      distanceCharge: 0,
      weightCharge: 0,
      itemSurcharges: 0,
      subtotal: 0,
      regionMultiplier: 1,
      total: 0,
      currency: 'ETB',
    };
  }

  private recalcDeliveryPricing(order: {
    senderLat?: number | null;
    senderLng?: number | null;
    receiverLat?: number | null;
    receiverLng?: number | null;
    totalWeightKg?: number | null;
    items?: Array<{
      type?: any;
      quantity?: number;
      isFragile?: boolean;
      isRefrigerated?: boolean;
    }>;
  }) {
    const senderLat = order.senderLat ?? null;
    const senderLng = order.senderLng ?? null;
    const receiverLat = order.receiverLat ?? null;
    const receiverLng = order.receiverLng ?? null;

    if (
      senderLat == null ||
      senderLng == null ||
      receiverLat == null ||
      receiverLng == null
    ) {
      return {
        distanceKm: null,
        deliveryFee: 0,
        courierEarning: 0,
        platformFee: 0,
        pricingBreakdown: this.buildZeroPricingBreakdown(),
      };
    }

    const distanceKm = this.pricing.distanceKm(
      senderLat,
      senderLng,
      receiverLat,
      receiverLng,
    );

    const pricingBreakdown = this.pricing.calculate({
      distanceKm,
      totalWeightKg: order.totalWeightKg ?? 0,
      items: (order.items ?? []).map((it) => ({
        type: it.type ?? 'OTHER',
        quantity: it.quantity ?? 1,
        isFragile: !!it.isFragile,
        isRefrigerated: !!it.isRefrigerated,
      })),
    });

    return {
      distanceKm,
      deliveryFee: pricingBreakdown.total,
      courierEarning: this.pricing.courierEarning(pricingBreakdown.total),
      platformFee: this.pricing.platformFee(pricingBreakdown.total),
      pricingBreakdown,
    };
  }

  // ══════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════
  async create(dto: CreateOrderDto, currentUser: any) {
    const senderPhone = this.normalizePhone(dto.sender.phone);
    const receiverPhone = this.normalizePhone(dto.receiver.phone);

    // Only STAFF can be recorded as the order creator (FK: orders.createdById → staff.id)
    const isStaff = currentUser?.accountType === AccountType.STAFF;
    const staffActorId = isStaff ? currentUser.id : null;
    const actorType: AccountType = isStaff
      ? AccountType.STAFF
      : AccountType.CUSTOMER;
    const actorId = currentUser?.id ?? null;
    const actorName = currentUser?.name ?? 'System';

    const receiverComplete =
      !!dto.receiver.name &&
      !!dto.receiver.address &&
      dto.receiver.lat != null &&
      dto.receiver.lng != null;

    const totalWeightKg = dto.items.reduce(
      (sum, it) => sum + it.weightKg * (it.quantity || 1),
      0,
    );
    const totalVolumeL = dto.items.reduce(
      (sum, it) => sum + (it.volumeL || 0) * (it.quantity || 1),
      0,
    );
    const isFragile = dto.items.some((it) => it.isFragile);
    const isRefrigerated = dto.items.some((it) => it.isRefrigerated);

    let status: OrderStatus = OrderStatus.DRAFT;
    if (receiverComplete) {
      status = OrderStatus.PENDING_PAYMENT;
    } else {
      status = OrderStatus.AWAITING_RECEIVER_LOCATION;
    }

    let distanceKm: number | null = null;
    if (
      dto.sender.lat != null &&
      dto.sender.lng != null &&
      dto.receiver.lat != null &&
      dto.receiver.lng != null
    ) {
      distanceKm = this.pricing.distanceKm(
        dto.sender.lat,
        dto.sender.lng,
        dto.receiver.lat,
        dto.receiver.lng,
      );
    }

    const pricingBreakdown = distanceKm != null
      ? this.pricing.calculate({
          distanceKm,
          totalWeightKg,
          items: dto.items.map((it) => ({
            type: it.type ?? 'OTHER',
            quantity: it.quantity || 1,
            isFragile: it.isFragile,
            isRefrigerated: it.isRefrigerated,
          })),
        })
      : this.buildZeroPricingBreakdown();

    const deliveryFee = pricingBreakdown.total;
    const courierEarning = distanceKm != null
      ? this.pricing.courierEarning(deliveryFee)
      : 0;
    const platformFee = distanceKm != null
      ? this.pricing.platformFee(deliveryFee)
      : 0;

    // ══════════════════════════════════════════════════
    // 🆕 AUTO-RESOLVE BRANCHES FROM LOCATION
    // ══════════════════════════════════════════════════
    let originBranchId = dto.originBranchId;
    if (currentUser.role === StaffRole.BRANCH_MANAGER) {
      originBranchId = currentUser.branchId;
    } else if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      !originBranchId
    ) {
      if (!currentUser.regionId) {
        throw new BadRequestException(
          'Regional Admin must be assigned to a region before creating orders',
        );
      }

      const nearestRegionalBranch = await this.branchResolver.findNearestBranch(
        dto.sender.lat,
        dto.sender.lng,
        currentUser.regionId,
      );
      const regionalBranch =
        nearestRegionalBranch ??
        (await this.branchResolver.findFirstActiveBranchInRegion(
          currentUser.regionId,
        ));

      if (!regionalBranch) {
        throw new BadRequestException(
          'No active branch is configured in your region',
        );
      }
      originBranchId = regionalBranch.id;
    }

    const resolved = await this.branchResolver.resolveForOrder({
      originBranchId,
      destBranchId: dto.destBranchId,
      senderLat: dto.sender.lat,
      senderLng: dto.sender.lng,
      receiverLat: dto.receiver.lat,
      receiverLng: dto.receiver.lng,
    });

    await this.assertOriginBranchAccess(resolved.originBranchId, currentUser);

    console.log('📍 Resolved branches:', {
      origin: resolved.originBranch?.name ?? 'none',
      originKm: resolved.originBranch?.distanceKm,
      dest: resolved.destBranch?.name ?? 'none',
      destKm: resolved.destBranch?.distanceKm,
    });

    const trackingNumber = await this.tracking.generate();
    const trackingToken = this.tracking.generateTrackingToken();

    let senderCustomerId = dto.sender.customerId;
    if (!senderCustomerId) {
      const existing = await this.prisma.customer.findUnique({
        where: { phone: senderPhone },
      });
      if (existing) senderCustomerId = existing.id;
    }

    let receiverCustomerId = dto.receiver.customerId;
    if (!receiverCustomerId) {
      const existing = await this.prisma.customer.findUnique({
        where: { phone: receiverPhone },
      });
      if (existing) receiverCustomerId = existing.id;
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          trackingNumber,
          trackingToken,
          trackingUrl: `${process.env.PUBLIC_WEB_URL || 'http://localhost:5173'}/track/${trackingToken}`,

          senderId: senderCustomerId,
          senderName: dto.sender.name,
          senderPhone,
          senderAddress: dto.sender.address,
          senderLat: dto.sender.lat,
          senderLng: dto.sender.lng,

          receiverId: receiverCustomerId,
          receiverName: dto.receiver.name,
          receiverPhone,
          receiverAddress: dto.receiver.address,
          receiverLat: dto.receiver.lat,
          receiverLng: dto.receiver.lng,
          receiverLocationSource: receiverComplete ? 'manual' : null,

          // 🆕 USE RESOLVED VALUES
          originBranchId: resolved.originBranchId,
          destBranchId: resolved.destBranchId,
          distanceKm,

          totalWeightKg,
          totalVolumeL,
          isFragile,
          isRefrigerated,
          packageDescription: dto.packageDescription,

          deliveryFee,
          courierEarning,
          platformFee,
          codAmount: dto.codAmount || 0,
          pricingBreakdown,

          paymentParty: dto.paymentParty || PaymentParty.SENDER,
          status,

          createdById: staffActorId,

          items: {
            create: dto.items.map((it) => ({
              type: it.type ?? 'OTHER',
              description: it.description,
              quantity: it.quantity || 1,
              weightKg: it.weightKg,
              lengthCm: it.lengthCm,
              widthCm: it.widthCm,
              heightCm: it.heightCm,
              volumeL: it.volumeL,
              declaredValue: it.declaredValue,
              isFragile: it.isFragile || false,
              isRefrigerated: it.isRefrigerated || false,
              photoUrl: it.photoUrl,
            })),
          },
        },
        include: {
          items: true,
          sender: { select: { id: true, name: true, phone: true } },
          receiver: { select: { id: true, name: true, phone: true } },
          originBranch: { select: { id: true, name: true, code: true } },
          destBranch: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          status,
          note:
            status === OrderStatus.AWAITING_RECEIVER_LOCATION
              ? 'Waiting for receiver to share location'
              : 'Order created',
          actorType,
          actorId,
          actorName,
          isPublic: false,
        },
      });

      return created;
    });

    // ══════════════════════════════════════════════════
    // POST-CREATE: QR + Tracking Link + SMS
    // ══════════════════════════════════════════════════

    // 1. Generate QR code
    try {
      await this.qr.generateForOrder(order.id, trackingNumber);
    } catch (err) {
      console.error('QR generation failed:', err);
    }

    // 2. Generate public tracking token + URL
    let trackingUrl: string | null = (order as any).trackingUrl ?? null;
    if (!trackingUrl) {
      try {
        const trackingResult = await this.qr.generateTrackingToken(order.id);
        trackingUrl = trackingResult.url;
      } catch (err) {
        console.error('Tracking token generation failed:', err);
      }
    }

    // 3. Ask the receiver for their location when the order has no destination.
    let receiverLink: any = null;
    if (!receiverComplete) {
      try {
        const link = await this.receiverLinks.createForOrder(
          order.id,
          receiverPhone,
          currentUser.id,
        );
        const smsSent = await this.sms.sendReceiverLink(
          receiverPhone,
          dto.sender.name,
          link.url,
          dto.receiver?.name ?? order.receiverName ?? 'Receiver',
        );
        receiverLink = { ...link, smsSent };
        if (!smsSent) {
          console.error(`Receiver link SMS was not accepted for order ${order.id}`);
        }
      } catch (err) {
        console.error(`Receiver link creation failed for order ${order.id}:`, err);
      }
    }

    // 4. Send tracking link SMS to sender
    if (dto.sender.phone && trackingUrl) {
      try {
        await this.sms.sendTrackingLink(
          dto.sender.phone,
          trackingNumber,
          trackingUrl,
        );
      } catch (err) {
        console.error('Sender tracking SMS failed:', err);
      }
    }

    // 5. If receiver has phone and location was provided, send them the tracking link too
    if (receiverPhone && trackingUrl && receiverComplete) {
      try {
        await this.sms.sendTrackingLink(
          receiverPhone,
          trackingNumber,
          trackingUrl,
        );
      } catch (err) {
        console.error('Receiver tracking SMS failed:', err);
      }
    }

    // ─── Courier assignment ───
    let courierAssigned: any = null;

    if (status === OrderStatus.PENDING_PAYMENT) {
      if (dto.courierId) {
        // Manual assignment
        try {
          const courier = await this.prisma.courier.findUnique({
            where: { id: dto.courierId },
          });

          if (courier && courier.status === 'APPROVED' && courier.isActive) {
            await this.prisma.$transaction([
              this.prisma.order.update({
                where: { id: order.id },
                data: {
                  courierId: dto.courierId,
                  status: OrderStatus.ASSIGNED,
                  assignedAt: new Date(),
                },
              }),
              this.prisma.orderEvent.create({
                data: {
                  orderId: order.id,
                  status: OrderStatus.ASSIGNED,
                  note: `Assigned to ${courier.name}`,
                  actorType: AccountType.STAFF,
                  actorId: currentUser.id,
                  actorName: currentUser.name,
                  isPublic: true,
                },
              }),
            ]);

            (order as any).status = OrderStatus.ASSIGNED;
            (order as any).courierId = dto.courierId;
            (order as any).courier = {
              id: courier.id,
              name: courier.name,
              phone: courier.phone,
            };
            courierAssigned = courier;

            this.trackingWs.broadcastStatusChange(order.id, {
              status: OrderStatus.ASSIGNED,
              note: `Courier ${courier.name} assigned`,
              timestamp: new Date().toISOString(),
            });
            await this.notifications.notifyOrderStatus({
              id: order.id,
              trackingNumber,
              status: OrderStatus.ASSIGNED,
              senderId: order.senderId,
              receiverId: order.receiverId,
              courierId: dto.courierId,
              senderAddress: order.senderAddress,
            });
          }
        } catch (err) {
          console.error('Courier manual assignment failed:', err);
        }
      } else if (dto.autoAssignCourier) {
        // Auto-assignment
        try {
          await this.autoAssignCourier(order.id, currentUser);

          const updated = await this.prisma.order.findUnique({
            where: { id: order.id },
            include: {
              courier: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  currentLat: true,
                  currentLng: true,
                  lastSeenAt: true,
                  isOnline: true,
                },
              },
            },
          });

          if (updated) {
            (order as any).status = updated.status;
            (order as any).courierId = updated.courierId;
            (order as any).courier = updated.courier;
            courierAssigned = updated.courier;
          }
        } catch (err) {
          console.error('Courier auto-assignment failed:', err);
        }
      }
    }

    // ══════════════════════════════════════════════════
    // 5d — Refresh order to include all new fields
    // ══════════════════════════════════════════════════
    const finalOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        sender: { select: { id: true, name: true, phone: true } },
        receiver: { select: { id: true, name: true, phone: true } },
        originBranch: { select: { id: true, name: true, code: true } },
        destBranch: { select: { id: true, name: true, code: true } },
        courier: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (finalOrder && finalOrder.status !== OrderStatus.ASSIGNED) {
      await this.notifications.notifyOrderStatus(finalOrder);
    }

    return {
      order: finalOrder,
      receiverLink,
      courierAssigned,
    };
  }

  // ══════════════════════════════════════════════════
  // LIST
  // ══════════════════════════════════════════════════
  async findAll(query: ListOrdersQueryDto, currentUser: any) {
    const where: any = { AND: [this.orderScope(currentUser)] };

    if (query.status) where.status = query.status;
    if (query.senderId) where.senderId = query.senderId;
    if (query.receiverId) where.receiverId = query.receiverId;
    if (query.courierId) where.courierId = query.courierId;
    if (query.originBranchId) {
      where.AND.push({ originBranchId: query.originBranchId });
    }

    if (query.search) {
      where.OR = [
        { trackingNumber: { contains: query.search, mode: 'insensitive' } },
        { senderName: { contains: query.search, mode: 'insensitive' } },
        { senderPhone: { contains: query.search } },
        { receiverName: { contains: query.search, mode: 'insensitive' } },
        { receiverPhone: { contains: query.search } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          sender: { select: { id: true, name: true, phone: true } },
          receiver: { select: { id: true, name: true, phone: true } },
          courier: {
            select: {
              id: true,
              name: true,
              phone: true,
              currentLat: true,
              currentLng: true,
              lastSeenAt: true,
              isOnline: true,
            },
          },
          originBranch: { select: { id: true, name: true, code: true } },
          destBranch: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════
  // GET ONE
  // ══════════════════════════════════════════════════
  async findOne(id: string, currentUser: any) {
    const order = await this.prisma.order.findFirst({
      where: { AND: [{ id }, this.orderScope(currentUser)] },
      include: {
        items: true,
        sender: { select: { id: true, name: true, phone: true, email: true } },
        receiver: { select: { id: true, name: true, phone: true, email: true } },
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            rating: true,
            currentLat: true,
            currentLng: true,
          },
        },
        originBranch: { select: { id: true, name: true, code: true } },
        destBranch: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 50 },
        receiverLinks: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            shortCode: true,
            status: true,
            expiresAt: true,
            openedAt: true,
            filledAt: true,
            otpVerified: true,
          },
        },
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }

  // ══════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════
  async update(id: string, dto: UpdateOrderDto, currentUser: any) {
    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(id, currentUser);

    if (
      existing.status === OrderStatus.DELIVERED ||
      existing.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot edit a ${existing.status} order`);
    }

    const data: any = {};
    if (dto.senderName !== undefined) data.senderName = dto.senderName;
    if (dto.senderAddress !== undefined) data.senderAddress = dto.senderAddress;
    if (dto.receiverName !== undefined) data.receiverName = dto.receiverName;
    if (dto.receiverAddress !== undefined) data.receiverAddress = dto.receiverAddress;
    if (dto.receiverLat !== undefined) data.receiverLat = dto.receiverLat;
    if (dto.receiverLng !== undefined) data.receiverLng = dto.receiverLng;
    const receiverLat = dto.receiverLat ?? existing.receiverLat;
    const receiverLng = dto.receiverLng ?? existing.receiverLng;
    const senderLat = existing.senderLat;
    const senderLng = existing.senderLng;

    const priceRecalc = this.recalcDeliveryPricing({
      senderLat,
      senderLng,
      receiverLat,
      receiverLng,
      totalWeightKg: existing.totalWeightKg,
      items: existing.items ?? [],
    });

    data.distanceKm = priceRecalc.distanceKm;
    data.deliveryFee = priceRecalc.deliveryFee;
    data.courierEarning = priceRecalc.courierEarning;
    data.platformFee = priceRecalc.platformFee;
    data.pricingBreakdown = priceRecalc.pricingBreakdown;

    if (dto.packageDescription !== undefined) data.packageDescription = dto.packageDescription;
    if (dto.paymentParty !== undefined) data.paymentParty = dto.paymentParty;
    if (dto.codAmount !== undefined) data.codAmount = dto.codAmount;

    const updated = await this.prisma.order.update({ where: { id }, data });

    this.trackingWs.broadcastStatusChange(id, {
      status: updated.status,
      note: 'Order updated',
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ══════════════════════════════════════════════════
  // ASSIGN COURIER (manual)
  // ══════════════════════════════════════════════════
  async assignCourier(orderId: string, courierId: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(orderId, currentUser);

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot assign courier to a ${order.status} order`);
    }

    if (order.courierId) {
      throw new BadRequestException('Order already has a courier assigned');
    }

    const courier = await this.prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier) throw new NotFoundException('Courier not found');
    if (
      currentUser.role === StaffRole.BRANCH_MANAGER &&
      courier.branchId !== currentUser.branchId
    ) {
      throw new ForbiddenException('You can only assign couriers from your branch');
    }
    if (currentUser.role === StaffRole.REGIONAL_ADMIN) {
      const branch = order.originBranchId
        ? await this.prisma.branch.findUnique({
            where: { id: order.originBranchId },
            select: { regionId: true },
          })
        : null;
      if (
        courier.regionId !== currentUser.regionId ||
        !branch ||
        branch.regionId !== currentUser.regionId
      ) {
        throw new ForbiddenException('Order and courier must be in your region');
      }
    }

    if (courier.status !== 'APPROVED') {
      throw new BadRequestException('Courier must be approved');
    }

    if (!courier.isActive) {
      throw new BadRequestException('Courier is suspended');
    }

    if (courier.maxWeightKg != null && order.totalWeightKg > courier.maxWeightKg) {
      throw new BadRequestException(
        `Courier capacity: ${courier.maxWeightKg} kg, order: ${order.totalWeightKg} kg`,
      );
    }

    if (order.isFragile && !courier.handlesFragile) {
      throw new BadRequestException('Courier does not handle fragile items');
    }

    if (order.isRefrigerated && !courier.handlesRefrigerated) {
      throw new BadRequestException('Courier does not handle refrigerated items');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: {
          courierId,
          status: OrderStatus.ASSIGNED,
          assignedAt: new Date(),
        },
        include: {
          courier: { select: { id: true, name: true, phone: true } },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          status: OrderStatus.ASSIGNED,
          note: `Assigned to courier ${courier.name}`,
          actorType: AccountType.STAFF,
          actorId: currentUser.id,
          actorName: currentUser.name,
          isPublic: true,
        },
      });

      return o;
    });

    this.trackingWs.broadcastStatusChange(orderId, {
      status: OrderStatus.ASSIGNED,
      note: `Courier ${courier.name} assigned`,
      timestamp: new Date().toISOString(),
    });
    await this.notifications.notifyOrderStatus(updated);

    return updated;
  }

  // ══════════════════════════════════════════════════
  // AUTO-ASSIGN COURIER (admin manual trigger)
  // ══════════════════════════════════════════════════
  async autoAssignCourier(orderId: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(orderId, currentUser);

    if (order.courierId) {
      throw new BadRequestException('Order already has a courier');
    }

    let requiredVehicles: any[] = [];
    if (order.totalWeightKg <= 25) {
      requiredVehicles = ['MOTORCYCLE', 'BICYCLE', 'CAR'];
    } else if (order.totalWeightKg <= 500) {
      requiredVehicles = ['CAR', 'VAN'];
    } else {
      requiredVehicles = ['VAN', 'TRUCK'];
    }

    const where: any = {
      status: 'APPROVED',
      isActive: true,
      vehicleType: { in: requiredVehicles },
    };

    if (order.originBranchId) where.branchId = order.originBranchId;
    if (order.isFragile) where.handlesFragile = true;
    if (order.isRefrigerated) where.handlesRefrigerated = true;

    const candidates = await this.prisma.courier.findMany({ where });

    if (!candidates.length) {
      throw new BadRequestException('No available courier matching requirements');
    }

    const sorted = candidates
      .map((c) => ({
        ...c,
        distance:
          c.currentLat != null &&
          c.currentLng != null &&
          order.senderLat != null &&
          order.senderLng != null
            ? this.pricing.distanceKm(
                c.currentLat,
                c.currentLng,
                order.senderLat,
                order.senderLng,
              )
            : 999999,
      }))
      .sort((a, b) => a.distance - b.distance);

    return this.assignCourier(orderId, sorted[0].id, currentUser);
  }

  // ══════════════════════════════════════════════════
  // UPDATE COURIER LOCATION
  // ══════════════════════════════════════════════════
  async updateCourierLocation(
    orderId: string,
    lat: number,
    lng: number,
    currentUser: any,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(orderId, currentUser);
    if (!order.courierId) throw new BadRequestException('No courier assigned');

    if (lat < 3.4 || lat > 14.9 || lng < 32.9 || lng > 48.0) {
      throw new BadRequestException('Coordinates outside Ethiopia');
    }

    let distanceToReceiver: number | undefined;
    let etaMinutes: number | undefined;

    if (order.receiverLat != null && order.receiverLng != null) {
      distanceToReceiver = this.pricing.distanceKm(
        lat,
        lng,
        order.receiverLat,
        order.receiverLng,
      );
      etaMinutes = Math.ceil((distanceToReceiver / 30) * 60);
    }

    await this.prisma.$transaction([
      this.prisma.courier.update({
        where: { id: order.courierId },
        data: {
          currentLat: lat,
          currentLng: lng,
          lastSeenAt: new Date(),
          isOnline: true,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          lastCourierLat: lat,
          lastCourierLng: lng,
          lastTrackedAt: new Date(),
          estimatedArrival: etaMinutes
            ? new Date(Date.now() + etaMinutes * 60 * 1000)
            : undefined,
        },
      }),
    ]);

    this.trackingWs.broadcastLocationUpdate(orderId, {
      lat,
      lng,
      courierId: order.courierId,
      timestamp: new Date().toISOString(),
      distanceToReceiver,
      etaMinutes,
      status: order.status,
    });

    if (distanceToReceiver != null) {
      const distanceMeters = distanceToReceiver * 1000;
      if (distanceMeters < 20) {
        this.trackingWs.broadcastProximityAlert(orderId, {
          level: 'AT_DOOR',
          distanceMeters,
          message: '🚪 Courier is at your door',
        });
      } else if (distanceMeters < 100) {
        this.trackingWs.broadcastProximityAlert(orderId, {
          level: 'ARRIVING',
          distanceMeters,
          message: '🔔 Courier is arriving',
        });
      } else if (distanceMeters < 500) {
        this.trackingWs.broadcastProximityAlert(orderId, {
          level: 'CLOSE',
          distanceMeters,
          message: '⏱️ Courier is 5 minutes away',
        });
      } else if (distanceMeters < 2000) {
        this.trackingWs.broadcastProximityAlert(orderId, {
          level: 'NEARBY',
          distanceMeters,
          message: '📍 Courier is nearby',
        });
      }
    }

    return {
      lat,
      lng,
      distanceToReceiver,
      etaMinutes,
      timestamp: new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════════
  // SEND RECEIVER LINK
  // ══════════════════════════════════════════════════
  async sendReceiverLink(
    id: string,
    dto: SendReceiverLinkDto,
    currentUser: any,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(id, currentUser);

    if (order.status !== OrderStatus.AWAITING_RECEIVER_LOCATION) {
      throw new BadRequestException('Order does not need receiver location');
    }

    const link = await this.receiverLinks.createForOrder(
      order.id,
      order.receiverPhone,
      currentUser.id,
    );
    const smsSent =
      dto.sendSms === false
        ? null
        : await this.sms.sendReceiverLink(
            order.receiverPhone,
            order.senderName,
            link.url,
            order.receiverName ?? 'Receiver',
          );

    if (smsSent === false) {
      console.error(`Receiver link SMS was not accepted for order ${order.id}`);
    }

    return { link, smsSent };
  }

  // ══════════════════════════════════════════════════
  // CANCEL
  // ══════════════════════════════════════════════════
  async cancel(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(id, currentUser);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered order');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          status: OrderStatus.CANCELLED,
          note: 'Order cancelled',
          actorType: AccountType.STAFF,
          actorId: currentUser.id,
          actorName: currentUser.name,
        },
      });
    });

    this.trackingWs.broadcastOrderEnd(id, {
      outcome: 'CANCELLED',
      message: 'Order cancelled by staff',
    });
    await this.notifications.notifyOrderStatus({
      ...order,
      status: OrderStatus.CANCELLED,
    });

    return { message: 'Order cancelled' };
  }

  // ══════════════════════════════════════════════════
  // UNASSIGN COURIER
  // ══════════════════════════════════════════════════
  async unassignCourier(orderId: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(orderId, currentUser);

    if (!order.courierId) {
      throw new BadRequestException('Order has no courier assigned');
    }

    const blocked: OrderStatus[] = [
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];

    if (blocked.includes(order.status)) {
      throw new BadRequestException(
        `Cannot unassign courier when order is ${order.status.replace(/_/g, ' ')}`,
      );
    }

    const previousCourier = await this.prisma.courier.findUnique({
      where: { id: order.courierId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          courierId: null,
          status: OrderStatus.PENDING_PAYMENT,
          assignedAt: null,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          status: OrderStatus.PENDING_PAYMENT,
          note: previousCourier
            ? `Courier ${previousCourier.name} unassigned`
            : 'Courier unassigned',
          actorType: AccountType.STAFF,
          actorId: currentUser.id,
          actorName: currentUser.name,
          isPublic: true,
        },
      });
    });

    this.trackingWs.broadcastStatusChange(orderId, {
      status: OrderStatus.PENDING_PAYMENT,
      note: 'Courier unassigned',
      timestamp: new Date().toISOString(),
    });

    return { message: 'Courier unassigned' };
  }

  // ══════════════════════════════════════════════════
  // DELETE (hard) — SUPER_ADMIN only
  // ══════════════════════════════════════════════════
  async remove(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
            events: true,
            receiverLinks: true,
            payments: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (currentUser.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete orders');
    }

    const BLOCKED: OrderStatus[] = [
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];
    if (BLOCKED.includes(order.status)) {
      throw new BadRequestException(
        `Cannot delete an order with status ${order.status.replace(/_/g, ' ')}. Cancel it instead.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderEvent.deleteMany({ where: { orderId: id } });
      await tx.receiverLink.deleteMany({ where: { orderId: id } });
      await tx.payment.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    this.trackingWs.broadcastOrderEnd(id, {
      outcome: 'CANCELLED',
      message: 'Order was deleted',
    });

    return { message: 'Order deleted', id };
  }

  // ══════════════════════════════════════════════════
  // SCAN RESOLVER (helper for staff scan-in / scan-out)
  // ══════════════════════════════════════════════════
  async resolveOrderFromScan(input: {
    code?: string;
    orderId?: string;
    trackingNumber?: string;
    signature?: string;
  }) {
    const raw = (input.code ?? input.trackingNumber ?? input.orderId ?? '').trim();
    if (!raw) {
      throw new BadRequestException(
        'QR code content, tracking number, or order ID is required',
      );
    }

    let trackingNumber = input.trackingNumber;
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
        originBranch: { select: { id: true, name: true, code: true } },
        destBranch: { select: { id: true, name: true, code: true } },
        courier: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found for scanned code: ${raw}`);
    }

    // 5. Signature verification if signature was passed / in QR
    if (signature) {
      const isQrValid =
        (order.qrCodeSignature && order.qrCodeSignature === signature) ||
        this.qr.verifySignature(order.trackingNumber, signature, 'qr');
      const isTrackingValid = order.trackingToken
        ? this.qr.verifySignature(
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

  // ══════════════════════════════════════════════════
  // STAFF SCAN-LOOKUP (Preview order details upon QR scan)
  // ══════════════════════════════════════════════════
  private makeWarehouseEventNote(
    type: 'IN' | 'OUT',
    note?: string | null,
  ): string {
    const clean = (note ?? '').trim();
    return clean ? `[WAREHOUSE:${type}] ${clean}` : `[WAREHOUSE:${type}]`;
  }

  private getWarehouseEventType(
    note?: string | null,
  ): 'SCAN_IN' | 'SCAN_OUT' | 'OTHER' {
    const text = (note ?? '').trim();
    if (!text) return 'OTHER';

    const normalized = text.toLowerCase();
    if (normalized.startsWith('[warehouse:in]')) return 'SCAN_IN';
    if (normalized.startsWith('[warehouse:out]')) return 'SCAN_OUT';
    if (
      normalized.startsWith('received at') ||
      normalized.startsWith('arrived at')
    ) {
      return 'SCAN_IN';
    }
    if (
      normalized.startsWith('dispatched') ||
      normalized.startsWith('handed over')
    ) {
      return 'SCAN_OUT';
    }
    return 'OTHER';
  }

  async staffScanLookup(dto: StaffScanInDto, currentUser: any) {
    const order = await this.resolveOrderFromScan({
      code: dto.code,
      signature: dto.signature,
      orderId: dto.orderId,
      trackingNumber: dto.trackingNumber,
    });

    const fullOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        sender: { select: { id: true, name: true, phone: true } },
        receiver: { select: { id: true, name: true, phone: true } },
        courier: { select: { id: true, name: true, phone: true } },
        originBranch: { select: { id: true, name: true, code: true } },
        destBranch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!fullOrder) throw new NotFoundException('Order not found');

    return {
      success: true,
      order: fullOrder,
    };
  }

  // ══════════════════════════════════════════════════
  // STAFF SCAN-IN (Adama staff scan-in)
  // ══════════════════════════════════════════════════
  async staffScanIn(dto: StaffScanInDto, currentUser: any) {
    const order = await this.resolveOrderFromScan({
      code: dto.code,
      signature: dto.signature,
      orderId: dto.orderId,
      trackingNumber: dto.trackingNumber,
    });

    // Check terminal statuses
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Order has already been delivered');
    }
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RETURNED
    ) {
      throw new BadRequestException(
        `Cannot scan in order: order is ${order.status.toLowerCase()}`,
      );
    }

    // Fetch staff info with branch & region
    const staff = await this.prisma.staff.findUnique({
      where: { id: currentUser.id },
      include: { branch: true, region: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const branchName =
      staff.branch?.name ?? (staff.region ? `${staff.region.name} Warehouse` : 'Warehouse');
    const cityName = staff.branch?.city ?? staff.region?.name ?? 'Branch';

    // Determine if this is Origin Warehouse intake or Destination Warehouse arrival:
    const isOriginIntake =
      order.originBranchId === staff.branchId &&
      (order.status === OrderStatus.DRAFT ||
        order.status === OrderStatus.PENDING_PAYMENT ||
        order.status === OrderStatus.PAID ||
        order.status === OrderStatus.AWAITING_RECEIVER_LOCATION);

    const nextStatus = isOriginIntake
      ? (order.status === OrderStatus.DRAFT ? OrderStatus.PENDING_PAYMENT : order.status)
      : OrderStatus.OUT_FOR_DELIVERY;

    const defaultWarehouseNote = isOriginIntake
      ? `Received at ${branchName} (${cityName}) by ${staff.name} — ready for driver pickup`
      : `Arrived at ${branchName} (${cityName}) and held by ${staff.name} — ready for customer pickup or dispatch`;
    const eventNote = this.makeWarehouseEventNote(
      'IN',
      dto.note ?? defaultWarehouseNote,
    );

    // If destination warehouse scans and destBranchId wasn't set, assign it
    let targetDestBranchId = order.destBranchId;
    if (!isOriginIntake && !targetDestBranchId) {
      if (staff.branchId) {
        targetDestBranchId = staff.branchId;
      } else if (staff.regionId) {
        const regionalBranch = await this.prisma.branch.findFirst({
          where: { regionId: staff.regionId },
          select: { id: true },
        });
        if (regionalBranch) targetDestBranchId = regionalBranch.id;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          ...(!isOriginIntake && targetDestBranchId
            ? { destBranchId: targetDestBranchId }
            : {}),
          ...(dto.lat != null ? { lastCourierLat: dto.lat } : {}),
          ...(dto.lng != null ? { lastCourierLng: dto.lng } : {}),
          ...(dto.lat != null || dto.lng != null
            ? { lastTrackedAt: new Date() }
            : {}),
        },
        include: {
          items: true,
          sender: { select: { id: true, name: true, phone: true } },
          receiver: { select: { id: true, name: true, phone: true } },
          originBranch: { select: { id: true, name: true, code: true } },
          destBranch: { select: { id: true, name: true, code: true } },
          courier: { select: { id: true, name: true, phone: true } },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: nextStatus,
          note: eventNote,
          actorType: AccountType.STAFF,
          actorId: staff.id,
          actorName: staff.name,
          location: `${branchName} (${cityName})`,
          lat: dto.lat ?? staff.branch?.lat ?? undefined,
          lng: dto.lng ?? staff.branch?.lng ?? undefined,
          isPublic: true,
        },
      });

      return res;
    });

    this.trackingWs.broadcastStatusChange(order.id, {
      status: nextStatus,
      note: eventNote,
      location: `${branchName} (${cityName})`,
      lat: dto.lat ?? staff.branch?.lat ?? undefined,
      lng: dto.lng ?? staff.branch?.lng ?? undefined,
      timestamp: new Date().toISOString(),
    });

    // ──────────────────────────────────────────────────
    // NOTIFICATIONS (Origin Intake vs Destination Arrival)
    // ──────────────────────────────────────────────────
    if (isOriginIntake) {
      // Origin Warehouse Intake: Notify sender
      void this.sms
        .sendCustomSms(
          order.senderPhone,
          `Your package ${order.trackingNumber} has been received at ${branchName}. We will dispatch it shortly.`,
        )
        .catch(() => {});

      void this.notifications.notifyCustomToCustomer(order.senderId, {
        title: `Package Received at ${branchName} 📦`,
        body: `Your package #${order.trackingNumber} was received at ${branchName}.`,
        data: {
          type: 'ORDER_AT_WAREHOUSE',
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          branchName,
        },
      });
    } else {
      // Destination Warehouse Arrival (e.g. Adama staff scans in from AA driver):
      // 1. Notify Receiver via SMS + Push + Telegram so they know to come pick it up
      void this.sms
        .sendArrivedAtBranch(
          order.receiverPhone,
          order.trackingNumber,
          branchName,
          true,
        )
        .catch(() => {});

      void this.notifications.notifyCustomToCustomer(order.receiverId, {
        title: `Package Arrived in ${cityName} 📍`,
        body: `Your package #${order.trackingNumber} has arrived at ${branchName}. It is ready for pickup at our office!`,
        data: {
          type: 'ORDER_ARRIVED_BRANCH',
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          branchName,
          city: cityName,
        },
      });

      // 2. Notify Sender via SMS + Push + Telegram
      void this.sms
        .sendArrivedAtBranch(
          order.senderPhone,
          order.trackingNumber,
          branchName,
          false,
        )
        .catch(() => {});

      void this.notifications.notifyCustomToCustomer(order.senderId, {
        title: `Package Arrived at Destination 📍`,
        body: `Your package #${order.trackingNumber} has arrived at ${branchName} (${cityName}) and is ready for pickup.`,
        data: {
          type: 'ORDER_ARRIVED_BRANCH',
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          branchName,
          city: cityName,
        },
      });
    }

    const inventory = await this.warehouseInventory(
      {
        state: 'all',
        branchId: staff.branchId ?? undefined,
        page: 1,
        limit: 50,
      },
      currentUser,
    );

    return {
      success: true,
      action: isOriginIntake ? 'origin_intake' : 'destination_arrival',
      status: nextStatus,
      warehouse: branchName,
      city: cityName,
      staffName: staff.name,
      order: {
        id: updated.id,
        trackingNumber: updated.trackingNumber,
        status: updated.status,
        originBranch: updated.originBranch?.name,
        destBranch: updated.destBranch?.name,
        courier: updated.courier?.name,
        receiverName: updated.receiverName,
        receiverPhone: updated.receiverPhone,
        senderName: updated.senderName,
        senderPhone: updated.senderPhone,
      },
      warehouseInventory: inventory.data,
      warehouseCounts: {
        total: inventory.total,
        inWarehouse: inventory.inWarehouse,
        leftWarehouse: inventory.leftWarehouse,
      },
      message: isOriginIntake
        ? `Order ${order.trackingNumber} received at ${branchName} by ${staff.name}`
        : `Order ${order.trackingNumber} arrived at ${branchName} (${cityName}). Notifications sent to receiver and sender.`,
    };
  }


// ══════════════════════════════════════════════════
// WAREHOUSE — shared scope helper
// ══════════════════════════════════════════════════
private async warehouseScope(query: WarehouseQueryDto, currentUser: any) {
  const staff = await this.prisma.staff.findUnique({
    where: { id: currentUser.id },
    select: { id: true, name: true, branchId: true, regionId: true, role: true },
  });
  if (!staff) throw new NotFoundException('Staff not found');

  // Explicit branch filter (only honored if it falls within the actor's scope)
  if (query.branchId) {
    if (staff.role === StaffRole.BRANCH_MANAGER && query.branchId !== staff.branchId) {
      throw new ForbiddenException('You can only view your own branch');
    }
    return {
      staff,
      branchFilter: { destBranchId: query.branchId },
      label: 'branch',
    };
  }

  if (staff.role === StaffRole.SUPER_ADMIN) {
    return { staff, branchFilter: {}, label: 'all' };
  }
  if (staff.role === StaffRole.REGIONAL_ADMIN) {
    if (!staff.regionId) {
      throw new ForbiddenException('Regional admin has no region assigned');
    }
    return {
      staff,
      branchFilter: { destBranch: { regionId: staff.regionId } },
      label: 'region',
    };
  }
  if (staff.role === StaffRole.BRANCH_MANAGER) {
    if (!staff.branchId) {
      throw new ForbiddenException('Branch manager has no branch assigned');
    }
    return {
      staff,
      branchFilter: { destBranchId: staff.branchId },
      label: 'branch',
    };
  }

  throw new ForbiddenException('You are not allowed to access warehouse inventory');
}

// ══════════════════════════════════════════════════
// WAREHOUSE — Inventory
// ══════════════════════════════════════════════════
async warehouseInventory(query: WarehouseQueryDto, currentUser: any) {
  const staff = await this.prisma.staff.findUnique({
    where: { id: currentUser.id },
    select: { id: true, name: true, branchId: true, regionId: true, role: true },
  });
  if (!staff) throw new NotFoundException('Staff not found');

  // ── 1. Scope filter: include BOTH origin and dest ──
  let scopeFilter: any;
  if (query.branchId) {
    if (
      staff.role === StaffRole.BRANCH_MANAGER &&
      query.branchId !== staff.branchId
    ) {
      throw new ForbiddenException('You can only view your own branch');
    }
    scopeFilter = {
      OR: [
        { destBranchId: query.branchId },
        { originBranchId: query.branchId },
      ],
    };
  } else if (staff.role === StaffRole.SUPER_ADMIN) {
    scopeFilter = {};
  } else if (staff.role === StaffRole.REGIONAL_ADMIN) {
    if (!staff.regionId) {
      throw new ForbiddenException('Regional admin has no region assigned');
    }
    scopeFilter = {
      OR: [
        { destBranch: { regionId: staff.regionId } },
        { originBranch: { regionId: staff.regionId } },
      ],
    };
  } else if (staff.role === StaffRole.BRANCH_MANAGER) {
    if (!staff.branchId) {
      throw new ForbiddenException('Branch manager has no branch assigned');
    }
    scopeFilter = {
      OR: [
        { destBranchId: staff.branchId },
        { originBranchId: staff.branchId },
      ],
    };
  } else {
    throw new ForbiddenException('You are not allowed to access warehouse inventory');
  }

  // ── 2. Where clause ──
  const where: any = {
    AND: [
      scopeFilter,
      {
        status: {
          notIn: [
            OrderStatus.CANCELLED,
            OrderStatus.RETURNED,
            OrderStatus.FAILED,
          ],
        },
      },
    ],
  };

  if (query.search) {
    where.AND.push({
      OR: [
        { trackingNumber: { contains: query.search, mode: 'insensitive' } },
        { senderName:     { contains: query.search, mode: 'insensitive' } },
        { receiverName:   { contains: query.search, mode: 'insensitive' } },
        { receiverPhone:  { contains: query.search } },
        { senderPhone:    { contains: query.search } },
      ],
    });
  }

  const raw = await this.prisma.order.findMany({
    where,
    take: 500,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { select: { id: true, description: true, quantity: true } },
      originBranch: { select: { id: true, name: true, code: true, city: true } },
      destBranch:   { select: { id: true, name: true, code: true, city: true } },
      courier:      { select: { id: true, name: true, phone: true } },
      events: {
        where: { actorType: 'STAFF' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true, status: true, note: true,
          actorName: true, actorId: true, createdAt: true,
          location: true,
        },
      },
    },
  });

  // ── 3. Branch-aware classifier ──
  const myBranchId = staff.branchId;
  const isSuperAdmin = staff.role === StaffRole.SUPER_ADMIN;

  const postPickupStatuses: OrderStatus[] = [
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ];
  const classify = (order: any, lastEvent: any): string => {
    const eventType = this.getWarehouseEventType(lastEvent?.note);
    const hasLeftOrigin = postPickupStatuses.includes(order.status);
    const isFinalized = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
      OrderStatus.FAILED,
    ].includes(order.status);

    if (eventType === 'SCAN_IN') {
      if (isFinalized) return 'LEFT_WAREHOUSE';
      if (isSuperAdmin) {
        return [
          OrderStatus.PICKED_UP,
          OrderStatus.IN_TRANSIT,
        ].includes(order.status)
          ? 'LEFT_WAREHOUSE'
          : 'IN_WAREHOUSE';
      }
      const isMyOrigin = order.originBranchId === myBranchId;
      const isMyDest = order.destBranchId === myBranchId;
      if (!isMyOrigin && !isMyDest) return 'NOT_MINE';
      return [
        OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT,
      ].includes(order.status)
        ? 'LEFT_WAREHOUSE'
        : 'IN_WAREHOUSE';
    }

    if (eventType === 'SCAN_OUT') {
      if (isSuperAdmin) return 'LEFT_WAREHOUSE';
      if (order.destBranchId === myBranchId || order.originBranchId === myBranchId) {
        return 'LEFT_WAREHOUSE';
      }
      return 'NOT_MINE';
    }

    // No scan-in/out yet — fall back to "created at my branch, not picked up"
    if (isSuperAdmin) return 'NOT_MINE';
    const isMyOrigin = order.originBranchId === myBranchId;
    return isMyOrigin && !hasLeftOrigin ? 'IN_WAREHOUSE' : 'NOT_MINE';
  };

  const classified = raw
    .map((o) => {
      const lastStaffEvent = o.events[0] ?? null;
      return {
        ...o,
        events: undefined,
        warehouseState: classify(o, lastStaffEvent),
        lastStaffEvent,
      };
    })
    .filter((o) => o.warehouseState !== 'NOT_MINE')
    .sort((a, b) => {
      const aT = a.lastStaffEvent?.createdAt?.getTime() ?? a.createdAt.getTime();
      const bT = b.lastStaffEvent?.createdAt?.getTime() ?? b.createdAt.getTime();
      return bT - aT;
    });

  const filtered =
    query.state === 'in'  ? classified.filter((o) => o.warehouseState === 'IN_WAREHOUSE')  :
    query.state === 'out' ? classified.filter((o) => o.warehouseState === 'LEFT_WAREHOUSE') :
                            classified;

  const page  = query.page  ?? 1;
  const limit = query.limit ?? 20;
  const skip  = (page - 1) * limit;
  const data  = filtered.slice(skip, skip + limit);

  return {
    data,
    total: filtered.length,
    inWarehouse:   classified.filter((o) => o.warehouseState === 'IN_WAREHOUSE').length,
    leftWarehouse: classified.filter((o) => o.warehouseState === 'LEFT_WAREHOUSE').length,
    page, limit,
    pages: Math.ceil(filtered.length / limit),
  };
}

// ══════════════════════════════════════════════════
// WAREHOUSE — History
// ══════════════════════════════════════════════════
async warehouseHistory(query: WarehouseHistoryQueryDto, currentUser: any) {
  const staff = await this.prisma.staff.findUnique({
    where: { id: currentUser.id },
    select: { id: true, branchId: true, regionId: true, role: true },
  });
  if (!staff) throw new NotFoundException('Staff not found');

  let scopeFilter: any;
  if (staff.role === StaffRole.SUPER_ADMIN) {
    scopeFilter = {};
  } else if (staff.role === StaffRole.REGIONAL_ADMIN) {
    scopeFilter = {
      OR: [
        { destBranch: { regionId: staff.regionId } },
        { originBranch: { regionId: staff.regionId } },
      ],
    };
  } else if (staff.role === StaffRole.BRANCH_MANAGER) {
    scopeFilter = {
      OR: [
        { destBranchId: staff.branchId },
        { originBranchId: staff.branchId },
      ],
    };
  } else {
    throw new ForbiddenException('Access denied');
  }

  const where: any = {
    actorType: 'STAFF',
    OR: [
      { note: { startsWith: '[WAREHOUSE:IN]' } },
      { note: { startsWith: '[WAREHOUSE:OUT]' } },
      { note: { startsWith: 'Received at' } },
      { note: { startsWith: 'Arrived at' } },
      { note: { startsWith: 'Dispatched' } },
      { note: { startsWith: 'Handed over' } },
    ],
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to   ? { lte: new Date(query.to)   } : {}),
          },
        }
      : {}),
  };

  if (Object.keys(scopeFilter).length > 0) {
    where.order = scopeFilter;
  }

  const page  = query.page  ?? 1;
  const limit = query.limit ?? 30;
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.orderEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            id: true, trackingNumber: true, status: true,
            senderName: true, senderPhone: true,
            receiverName: true, receiverPhone: true,
            destBranch:   { select: { id: true, name: true, code: true } },
            originBranch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
    this.prisma.orderEvent.count({ where }),
  ]);

  const enriched = data.map((e) => {
    const kind = this.getWarehouseEventType(e.note);
    return { ...e, kind };
  });

  return {
    data: enriched,
    total, page, limit,
    pages: Math.ceil(total / limit),
  };
}
// ══════════════════════════════════════════════════
// WAREHOUSE — Stats
// ══════════════════════════════════════════════════
async warehouseStats(currentUser: any) {
  const staff = await this.prisma.staff.findUnique({
    where: { id: currentUser.id },
    select: { id: true, name: true, branchId: true, regionId: true, role: true },
  });
  if (!staff) throw new NotFoundException('Staff not found');

  let scopeFilter: any;
  if (staff.role === StaffRole.SUPER_ADMIN) {
    scopeFilter = {};
  } else if (staff.role === StaffRole.REGIONAL_ADMIN) {
    if (!staff.regionId) throw new ForbiddenException('Regional admin has no region');
    scopeFilter = {
      OR: [
        { destBranch: { regionId: staff.regionId } },
        { originBranch: { regionId: staff.regionId } },
      ],
    };
  } else if (staff.role === StaffRole.BRANCH_MANAGER) {
    if (!staff.branchId) throw new ForbiddenException('Branch manager has no branch');
    scopeFilter = {
      OR: [
        { destBranchId: staff.branchId },
        { originBranchId: staff.branchId },
      ],
    };
  } else {
    throw new ForbiddenException('Access denied');
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [scanIns, scanOuts, orders] = await Promise.all([
    this.prisma.orderEvent.count({
      where: {
        actorType: 'STAFF',
        createdAt: { gte: startOfDay },
        OR: [
          { note: { startsWith: '[WAREHOUSE:IN]' } },
          { note: { startsWith: 'Received at' } },
          { note: { startsWith: 'Arrived at' } },
        ],
        ...(Object.keys(scopeFilter).length > 0 ? { order: scopeFilter } : {}),
      },
    }),
    this.prisma.orderEvent.count({
      where: {
        actorType: 'STAFF',
        createdAt: { gte: startOfDay },
        OR: [
          { note: { startsWith: '[WAREHOUSE:OUT]' } },
          { note: { startsWith: 'Dispatched' } },
          { note: { startsWith: 'Handed over' } },
        ],
        ...(Object.keys(scopeFilter).length > 0 ? { order: scopeFilter } : {}),
      },
    }),
    this.prisma.order.findMany({
      where: {
        AND: [
          scopeFilter,
          {
            status: {
              notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED, OrderStatus.FAILED],
            },
          },
        ],
      },
      take: 500,
      include: {
        events: {
          where: { actorType: 'STAFF' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { note: true },
        },
      },
    }),
  ]);

  const myBranchId = staff.branchId;
  const isSuperAdmin = staff.role === StaffRole.SUPER_ADMIN;
  const postPickupStatuses: OrderStatus[] = [
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ];

  const isInWarehouse = (o: any) => {
    const eventType = this.getWarehouseEventType(o.events[0]?.note);
    const hasLeft = postPickupStatuses.includes(o.status);

    if (eventType === 'SCAN_IN') {
      if (isSuperAdmin) return !hasLeft;
      if (o.originBranchId === myBranchId) return !hasLeft;
      if (o.destBranchId === myBranchId) return true;
      return false;
    }
    if (eventType === 'SCAN_OUT') {
      return false;
    }
    // No scan-in yet
    if (isSuperAdmin) return false;
    return o.originBranchId === myBranchId && !hasLeft;
  };

  const inWarehouse = orders.filter(isInWarehouse).length;

  return {
    today: { scanIns, scanOuts },
    currentlyInWarehouse: inWarehouse,
    pendingDispatch: inWarehouse,
  };
}


  // ══════════════════════════════════════════════════
  // STAFF SCAN-OUT (A: Handover to Receiver, B: Dispatch to Courier)
  // ══════════════════════════════════════════════════
  async staffScanOut(dto: StaffScanOutDto, currentUser: any) {
    const order = await this.resolveOrderFromScan({
      code: dto.code,
      signature: dto.signature,
      orderId: dto.orderId,
      trackingNumber: dto.trackingNumber,
    });

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Order has already been delivered');
    }
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RETURNED
    ) {
      throw new BadRequestException(
        `Cannot scan out order: order is ${order.status.toLowerCase()}`,
      );
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: currentUser.id },
      include: { branch: true, region: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const branchName =
      staff.branch?.name ?? (staff.region ? `${staff.region.name} Warehouse` : 'Warehouse');
    const cityName = staff.branch?.city ?? staff.region?.name ?? 'Branch';
    const action =
      dto.action ??
      (dto.courierId
        ? StaffScanOutAction.DISPATCH
        : StaffScanOutAction.HANDOVER);

    // ──────────────────────────────────────────────────
    // A) RECEIVER WALKS IN → HANDOVER
    // ──────────────────────────────────────────────────
    if (action === StaffScanOutAction.HANDOVER) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const res = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.DELIVERED,
            deliveredAt: new Date(),
            receiverConfirmed: true,
            ...(dto.lat != null ? { lastCourierLat: dto.lat } : {}),
            ...(dto.lng != null ? { lastCourierLng: dto.lng } : {}),
            ...(dto.lat != null || dto.lng != null
              ? { lastTrackedAt: new Date() }
              : {}),
          },
          include: {
            items: true,
            sender: { select: { id: true, name: true, phone: true } },
            receiver: { select: { id: true, name: true, phone: true } },
            originBranch: { select: { id: true, name: true, code: true } },
            destBranch: { select: { id: true, name: true, code: true } },
            courier: { select: { id: true, name: true, phone: true } },
          },
        });

        const defaultWarehouseNote = `Handed over to receiver at ${branchName} (${cityName}) by ${staff.name}`;
        const eventNote = this.makeWarehouseEventNote(
          'OUT',
          dto.note ?? defaultWarehouseNote,
        );
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            status: OrderStatus.DELIVERED,
            note: eventNote,
            actorType: AccountType.STAFF,
            actorId: staff.id,
            actorName: staff.name,
            location: `${branchName} (${cityName})`,
            lat: dto.lat ?? staff.branch?.lat ?? undefined,
            lng: dto.lng ?? staff.branch?.lng ?? undefined,
            isPublic: true,
          },
        });

        // AA courier earning → RELEASED
        if (order.courierEarning > 0) {
          const pendingEarnings = await tx.courierEarning.findMany({
            where: { orderId: order.id, status: EarningStatus.PENDING },
          });

          if (pendingEarnings.length > 0) {
            await tx.courierEarning.updateMany({
              where: { orderId: order.id, status: EarningStatus.PENDING },
              data: {
                status: EarningStatus.RELEASED,
                releasedAt: new Date(),
              },
            });
          } else if (order.courierId) {
            await tx.courierEarning.create({
              data: {
                courierId: order.courierId,
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

        return res;
      });

      this.trackingWs.broadcastOrderEnd(order.id, {
        outcome: 'DELIVERED',
        message: `Order delivered to receiver at ${branchName}`,
      });

      // ──────────────────────────────────────────────────
      // NOTIFICATIONS ON HANDOVER (Delivered)
      // ──────────────────────────────────────────────────
      // 1. Notify Sender that receiver collected the parcel
      void this.sms
        .sendHandedOver(
          order.senderPhone,
          order.trackingNumber,
          branchName,
          false,
        )
        .catch(() => {});

      void this.notifications.notifyCustomToCustomer(order.senderId, {
        title: `Package Delivered 🎉`,
        body: `Your package #${order.trackingNumber} was collected by the receiver at ${branchName}.`,
        data: {
          type: 'ORDER_DELIVERED',
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          branchName,
        },
      });

      // 2. Notify Receiver confirming pickup
      void this.sms
        .sendHandedOver(
          order.receiverPhone,
          order.trackingNumber,
          branchName,
          true,
        )
        .catch(() => {});

      void this.notifications.notifyCustomToCustomer(order.receiverId, {
        title: `Package Collected 🎉`,
        body: `Package #${order.trackingNumber} has been handed over to you at ${branchName}. Thank you!`,
        data: {
          type: 'ORDER_DELIVERED',
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          branchName,
        },
      });

      const inventory = await this.warehouseInventory(
        {
          state: 'all',
          branchId: staff.branchId ?? undefined,
          page: 1,
          limit: 50,
        },
        currentUser,
      );

      return {
        success: true,
        action: StaffScanOutAction.HANDOVER,
        status: OrderStatus.DELIVERED,
        warehouse: branchName,
        city: cityName,
        staffName: staff.name,
        order: {
          id: updated.id,
          trackingNumber: updated.trackingNumber,
          status: updated.status,
          deliveredAt: updated.deliveredAt,
          originBranch: updated.originBranch?.name,
          destBranch: updated.destBranch?.name,
          receiverName: updated.receiverName,
          receiverPhone: updated.receiverPhone,
          senderName: updated.senderName,
          senderPhone: updated.senderPhone,
        },
        warehouseInventory: inventory.data,
        warehouseCounts: {
          total: inventory.total,
          inWarehouse: inventory.inWarehouse,
          leftWarehouse: inventory.leftWarehouse,
        },
        message: `Order ${order.trackingNumber} handed over to receiver at ${branchName} by ${staff.name}`,
      };
    }

    // ──────────────────────────────────────────────────
    // B) BRANCH CALLS LAST-MILE COURIER → DISPATCH
    // ──────────────────────────────────────────────────
    if (action === StaffScanOutAction.DISPATCH) {
      if (!dto.courierId) {
        throw new BadRequestException(
          'courierId is required for dispatch scan-out',
        );
      }

      const courier = await this.prisma.courier.findUnique({
        where: { id: dto.courierId },
      });
      if (!courier) {
        throw new NotFoundException(`Courier ${dto.courierId} not found`);
      }

      const previousCourierId = order.courierId;
      const isReassigned =
        previousCourierId != null && previousCourierId !== courier.id;

      const updated = await this.prisma.$transaction(async (tx) => {
        const res = await tx.order.update({
          where: { id: order.id },
          data: {
            courierId: courier.id,
            status: OrderStatus.OUT_FOR_DELIVERY,
            assignedAt: new Date(),
          },
          include: {
            items: true,
            sender: { select: { id: true, name: true, phone: true } },
            receiver: { select: { id: true, name: true, phone: true } },
            originBranch: { select: { id: true, name: true, code: true } },
            destBranch: { select: { id: true, name: true, code: true } },
            courier: { select: { id: true, name: true, phone: true } },
          },
        });

        const defaultWarehouseNote = `Dispatched to last-mile courier ${courier.name} at ${branchName} (${cityName}) by ${staff.name}`;
        const eventNote = this.makeWarehouseEventNote(
          'OUT',
          dto.note ?? defaultWarehouseNote,
        );
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            status: OrderStatus.OUT_FOR_DELIVERY,
            note: eventNote,
            actorType: AccountType.STAFF,
            actorId: staff.id,
            actorName: staff.name,
            location: `${branchName} (${cityName})`,
            lat: dto.lat ?? staff.branch?.lat ?? undefined,
            lng: dto.lng ?? staff.branch?.lng ?? undefined,
            isPublic: true,
          },
        });

        // AA courier earning → CANCELLED
        if (isReassigned && previousCourierId) {
          await tx.courierEarning.updateMany({
            where: {
              orderId: order.id,
              courierId: previousCourierId,
              status: EarningStatus.PENDING,
            },
            data: { status: EarningStatus.CANCELLED },
          });
        }

        // new courier earning → PENDING
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

        return res;
      });

      this.trackingWs.broadcastStatusChange(order.id, {
        status: OrderStatus.OUT_FOR_DELIVERY,
        note: `Dispatched to courier ${courier.name} at ${branchName}`,
        location: `${branchName} (${cityName})`,
        lat: dto.lat ?? staff.branch?.lat ?? undefined,
        lng: dto.lng ?? staff.branch?.lng ?? undefined,
        timestamp: new Date().toISOString(),
      });

      // ──────────────────────────────────────────────────
      // NOTIFICATIONS ON DISPATCH
      // ──────────────────────────────────────────────────
      void this.sms
        .sendCourierAssigned(
          order.receiverPhone,
          order.trackingNumber,
          courier.name,
          courier.phone,
        )
        .catch(() => {});

      void this.notifications.notifyCustomToCustomer(order.receiverId, {
        title: `Out for Delivery 🛵`,
        body: `Courier ${courier.name} (${courier.phone}) has been dispatched with your package #${order.trackingNumber}.`,
        data: {
          type: 'COURIER_ASSIGNED',
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          courierName: courier.name,
          courierPhone: courier.phone,
        },
      });

      const inventory = await this.warehouseInventory(
        {
          state: 'all',
          branchId: staff.branchId ?? undefined,
          page: 1,
          limit: 50,
        },
        currentUser,
      );

      return {
        success: true,
        action: StaffScanOutAction.DISPATCH,
        status: OrderStatus.OUT_FOR_DELIVERY,
        warehouse: branchName,
        city: cityName,
        staffName: staff.name,
        order: {
          id: updated.id,
          trackingNumber: updated.trackingNumber,
          status: updated.status,
          originBranch: updated.originBranch?.name,
          destBranch: updated.destBranch?.name,
          courier: { id: courier.id, name: courier.name, phone: courier.phone },
          receiverName: updated.receiverName,
          receiverPhone: updated.receiverPhone,
          senderName: updated.senderName,
          senderPhone: updated.senderPhone,
        },
        courier: { id: courier.id, name: courier.name, phone: courier.phone },
        warehouseInventory: inventory.data,
        warehouseCounts: {
          total: inventory.total,
          inWarehouse: inventory.inWarehouse,
          leftWarehouse: inventory.leftWarehouse,
        },
        message: `Order ${order.trackingNumber} dispatched to last-mile courier ${courier.name}`,
      };
    }

    throw new BadRequestException(`Unknown scan-out action: ${action}`);
  }
}
