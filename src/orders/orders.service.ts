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
import {
  AccountType,
  OrderStatus,
  PaymentParty,
  StaffRole,
} from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private tracking: TrackingNumberService,
    private pricing: PricingService,
    private receiverLinks: ReceiverLinksService,
    private trackingWs: TrackingGateway,
    private qr: QrService,                    // ← NEW
    private sms: AfroMessageService,          // ← NEW
  ) {}

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    return '251' + digits;
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

    const pricingBreakdown = this.pricing.calculate({
      distanceKm: distanceKm || 0,
      totalWeightKg,
      items: dto.items.map((it) => ({
        type: it.type ?? 'OTHER',
        quantity: it.quantity || 1,
        isFragile: it.isFragile,
        isRefrigerated: it.isRefrigerated,
      })),
    });

    const deliveryFee = pricingBreakdown.total;
    const courierEarning = this.pricing.courierEarning(deliveryFee);
    const platformFee = this.pricing.platformFee(deliveryFee);

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

          originBranchId: dto.originBranchId,
          destBranchId: dto.destBranchId,
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
    //    NOTE: order already has trackingToken/trackingUrl from creation.
    //    Only regenerate if QrService is authoritative. Using existing to avoid duplication.
    let trackingUrl: string | null = (order as any).trackingUrl ?? null;
    if (!trackingUrl) {
      try {
        const trackingResult = await this.qr.generateTrackingToken(order.id);
        trackingUrl = trackingResult.url;
      } catch (err) {
        console.error('Tracking token generation failed:', err);
      }
    }

    // 3. Generate receiver link if needed
    let receiverLink: any = null;
    if (dto.sendReceiverLink && !receiverComplete) {
      try {
        receiverLink = await this.receiverLinks.createForOrder(
          order.id,
          receiverPhone,
          currentUser.id,
        );

        // Send SMS with receiver link
        await this.sms.sendReceiverLink(
          receiverPhone,
          dto.sender.name,
          receiverLink.url,
        );
      } catch (err) {
        console.error('Receiver link creation/SMS failed:', err);
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
              courier: { select: { id: true, name: true, phone: true } },
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
        courier: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

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
    const where: any = {};

    if (currentUser.role === StaffRole.REGIONAL_ADMIN && currentUser.regionId) {
      where.originBranch = { regionId: currentUser.regionId };
    }

    if (query.status) where.status = query.status;
    if (query.senderId) where.senderId = query.senderId;
    if (query.receiverId) where.receiverId = query.receiverId;
    if (query.courierId) where.courierId = query.courierId;
    if (query.originBranchId) where.originBranchId = query.originBranchId;

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
          sender: { select: { id: true, name: true, phone: true } },
          receiver: { select: { id: true, name: true, phone: true } },
          courier: { select: { id: true, name: true, phone: true } },
          originBranch: { select: { id: true, name: true, code: true } },
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
    const order = await this.prisma.order.findUnique({
      where: { id },
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
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');

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

    return updated;
  }

  // ══════════════════════════════════════════════════
  // AUTO-ASSIGN COURIER
  // ══════════════════════════════════════════════════
  async autoAssignCourier(orderId: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

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

    if (order.status !== OrderStatus.AWAITING_RECEIVER_LOCATION) {
      throw new BadRequestException('Order does not need receiver location');
    }

    const link = await this.receiverLinks.createForOrder(
      order.id,
      order.receiverPhone,
      currentUser.id,
    );

    return { link };
  }

  // ══════════════════════════════════════════════════
  // CANCEL
  // ══════════════════════════════════════════════════
  async cancel(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

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

    return { message: 'Order cancelled' };
  }

  // ══════════════════════════════════════════════════
  // UNASSIGN COURIER
  // ══════════════════════════════════════════════════
  async unassignCourier(orderId: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

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

    // Only SUPER_ADMIN may hard-delete
    if (currentUser.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete orders');
    }

    // Block deletion of orders already in motion
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

    // Cascade delete in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.orderEvent.deleteMany({ where: { orderId: id } });
      await tx.receiverLink.deleteMany({ where: { orderId: id } });
      await tx.payment.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    // Notify live subscribers
    this.trackingWs.broadcastOrderEnd(id, {
      outcome: 'CANCELLED',
      message: 'Order was deleted',
    });

    return { message: 'Order deleted', id };
  }

}