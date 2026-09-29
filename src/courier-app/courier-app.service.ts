import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import {
  OrderStatus,
  CourierStatus,
  EarningStatus,
} from '@prisma/client';

@Injectable()
export class CourierAppService {
  constructor(private prisma: PrismaService) {}

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

    if (detailed) {
      base.events = order.events ?? [];
      base.payments = order.payments ?? [];
    }

    return base;
  }
}