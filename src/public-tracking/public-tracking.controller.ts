import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('public')
export class PublicTrackingController {
  constructor(private prisma: PrismaService) {}

  @Get('track/:token')
  async track(@Param('token') token: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ trackingToken: token }, { trackingNumber: token }],
      },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            currentLat: true,
            currentLng: true,
          },
        },
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        items: true,
        _count: { select: { items: true } },
      },
    });

    if (!order) throw new NotFoundException('Tracking link not found');

    return {
      order: {
        id: order.id,
        trackingNumber: order.trackingNumber,
        status: order.status,
        senderName: maskName(order.senderName),
        receiverName: order.receiverName
          ? maskName(order.receiverName)
          : undefined,
        senderLat: order.senderLat,
        senderLng: order.senderLng,
        receiverLat: order.receiverLat,
        receiverLng: order.receiverLng,
        distanceKm: order.distanceKm,
        totalWeightKg: order.totalWeightKg,
        itemCount: order._count.items,
        createdAt: order.createdAt,
        lastCourierLat: order.lastCourierLat,
        lastCourierLng: order.lastCourierLng,
        lastTrackedAt: order.lastTrackedAt,
        estimatedArrival: order.estimatedArrival,
        courier: order.courier
          ? {
              id: order.courier.id,
              name: maskName(order.courier.name),
              phone: maskPhone(order.courier.phone || ''),
              vehicleType: order.courier.vehicleType,
              vehiclePlate: order.courier.vehiclePlate,
              currentLat: order.courier.currentLat,
              currentLng: order.courier.currentLng,
            }
          : null,
        events: order.events.map((e) => ({
          id: e.id,
          status: e.status,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    };
  }
}

function maskName(name: string): string {
  if (!name) return '';
  const [first, last] = name.split(' ');
  return last ? `${first} ${last[0]}.` : first;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}
