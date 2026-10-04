import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { InitChapaPaymentDto } from './dto/init-chapa-payment.dto';
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  PaymentParty,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private chapa: ChapaService,
  ) {}

  // ══════════════════════════════════════════════════
  // INIT CHAPA PAYMENT
  // ══════════════════════════════════════════════════
  async initChapaPayment(dto: InitChapaPaymentDto, customerId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { sender: true, receiver: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID)
      throw new BadRequestException('Order already paid');

    const provider = await this.chapa.getChapaProvider();

    // Decide amount — fallback to order total
    const amount =
      dto.amount ??
      order.codAmount ??
      order.deliveryFee ??
      0;

    if (!amount || amount <= 0)
      throw new BadRequestException('Invalid payment amount');

    if (provider.minAmount && amount < provider.minAmount)
      throw new BadRequestException(
        `Minimum amount is ${provider.minAmount} ETB`,
      );
    if (provider.maxAmount && amount > provider.maxAmount)
      throw new BadRequestException(
        `Maximum amount is ${provider.maxAmount} ETB`,
      );

    // Unique tx_ref
    const txRef = `DEL-${order.trackingNumber}-${randomUUID().slice(0, 8)}`;

    // Who's paying?
    const party = order.paymentParty || PaymentParty.SENDER;

    // Create Payment row (PENDING)
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount,
        currency: 'ETB',
        method: PaymentMethod.CHAPA,
        party,
        status: PaymentStatus.PENDING,
        gatewayRef: txRef,
        notes: 'Chapa checkout initialized',
      },
    });

    // Contact info — prefer sender, fallback to receiver
    const payer =
      party === PaymentParty.RECEIVER ? order.receiver : order.sender;

    const email =
      dto.email ||
      payer?.email ||
      'yades.dev@gmail.com';

    const firstName = dto.firstName || payer?.name?.split(' ')[0] || 'Customer';
    const lastName =
      dto.lastName || payer?.name?.split(' ').slice(1).join(' ') || 'User';
    const phone = dto.phone || payer?.phone || order.senderPhone;

    // Backend URL — where Chapa POSTs the webhook
    const BACKEND_URL =
      process.env.BACKEND_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';

    // Frontend URL — where the user's browser redirects after payment
    const FRONTEND_URL =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5174';

    const webhookUrl =
      provider.webhookUrl ||
      `${BACKEND_URL}/api/v1/payments/chapa/webhook`;

    const returnUrl =
      dto.returnUrl ||
      `${FRONTEND_URL}/payment/success?tx_ref=${txRef}`;

    const { checkoutUrl } = await this.chapa.initialize({
      amount,
      email,
      firstName,
      lastName,
      phone,
      txRef,
      callbackUrl: webhookUrl,
      returnUrl,
      title: 'Deliver Ethiopia',
      description: `Order ${order.trackingNumber}`,
      provider,
    });

    return {
      paymentId: payment.id,
      txRef,
      checkoutUrl,
      amount,
      currency: 'ETB',
    };
  }

  // ══════════════════════════════════════════════════
  // VERIFY CHAPA PAYMENT
  // ══════════════════════════════════════════════════
  async verifyChapaPayment(txRef: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayRef: txRef },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // Idempotent — don't double-verify if already PAID
    if (payment.status === PaymentStatus.PAID) {
      return { status: payment.status, verified: true, alreadyPaid: true };
    }

    const result = await this.chapa.verify(txRef);

    const newStatus = result.verified
      ? PaymentStatus.PAID
      : PaymentStatus.FAILED;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          paidAt: result.verified ? new Date() : null,
          gatewayPayload: result.raw as any,
        },
      });

      if (result.verified) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paymentMethod: PaymentMethod.CHAPA,
            paidAt: new Date(),
            status: OrderStatus.PAID,
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId: payment.orderId,
            status: OrderStatus.PAID,
            note: `Payment received via Chapa (${txRef})`,
            isPublic: true,
          },
        });
      }
    });

    return {
      status: newStatus,
      verified: result.verified,
      amount: result.amount,
      paymentMethod: result.paymentMethod,
    };
  }

  // ══════════════════════════════════════════════════
  // WEBHOOK HANDLER
  // ══════════════════════════════════════════════════
  async handleChapaWebhook(body: any) {
    this.logger.log('Chapa webhook received: ' + JSON.stringify(body));

    const txRef =
      body?.tx_ref || body?.trx_ref || body?.data?.tx_ref || body?.reference;

    if (!txRef) {
      this.logger.warn('Chapa webhook: no tx_ref found');
      return { ok: true };
    }

    try {
      await this.verifyChapaPayment(txRef);
    } catch (e: any) {
      this.logger.error(`Webhook verify failed for ${txRef}: ${e.message}`);
    }

    return { ok: true };
  }

  // ══════════════════════════════════════════════════
  // LIST ORDER PAYMENTS (admin)
  // ══════════════════════════════════════════════════
  async listOrderPayments(orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ══════════════════════════════════════════════════
  // LIST MY PAYMENTS (customer OR courier)
  // ══════════════════════════════════════════════════
  async listMyPayments(
    userId: string,
    accountType: 'CUSTOMER' | 'COURIER' | 'STAFF',
  ) {
    // ── COURIER: payments for orders they are assigned to ──
    if (accountType === 'COURIER') {
      return this.prisma.payment.findMany({
        where: {
          order: { courierId: userId },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              trackingNumber: true,
              senderName: true,
              receiverName: true,
              deliveryFee: true,
              courierEarning: true,
            },
          },
        },
        take: 100,
      });
    }

    // ── CUSTOMER: payments for orders they sent or received ──
    return this.prisma.payment.findMany({
      where: {
        order: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            trackingNumber: true,
            senderName: true,
            receiverName: true,
            deliveryFee: true,
            courierEarning: true,
          },
        },
      },
      take: 100,
    });
  }

  async markRefunded(
  paymentId: string,
  reason: string,
  amount?: number,
  staffId?: string,
) {
  this.logger.log(
    `markRefunded: paymentId=${paymentId}, staffId=${staffId || '(none)'}`,
  );

  const payment = await this.prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new NotFoundException('Payment not found');
  if (payment.status !== PaymentStatus.PAID)
    throw new BadRequestException('Only PAID payments can be refunded');

  // ── Verify staff exists before using as FK ──
  let validStaffId: string | undefined = undefined;
  if (staffId) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true },
    });
    if (staff) {
      validStaffId = staff.id;
    } else {
      this.logger.warn(
        `⚠️  Staff "${staffId}" not found — refund will be recorded WITHOUT createdById`,
      );
    }
  }

  await this.prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
      refundAmount: amount ?? payment.amount,
      refundReason: reason,
      // Only set if we verified the staff exists
      ...(validStaffId ? { createdById: validStaffId } : {}),
    },
  });

  await this.prisma.order.update({
    where: { id: payment.orderId },
    data: { paymentStatus: PaymentStatus.REFUNDED },
  });

  return { message: 'Payment marked as refunded' };
}
  // ══════════════════════════════════════════════════
// LIST ALL PAYMENTS (admin)
// ══════════════════════════════════════════════════
async listAllPayments(filters: {
  page: number;
  limit: number;
  status?: string;
  method?: string;
  search?: string;
  from?: string;
  to?: string;
}) {
  const { page, limit, status, method, search, from, to } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) where.status = status;
  if (method) where.method = method;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  if (search) {
    where.OR = [
      { gatewayRef: { contains: search, mode: 'insensitive' } },
      { order: { trackingNumber: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    this.prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            trackingNumber: true,
            senderName: true,
            senderPhone: true,
            receiverName: true,
            receiverPhone: true,
            deliveryFee: true,
            courierEarning: true,
            status: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    }),
    this.prisma.payment.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

// ══════════════════════════════════════════════════
// PAYMENT STATS
// ══════════════════════════════════════════════════
async getPaymentStats() {
  const [totalCount, totalPaid, totalPending, totalFailed, totalRefunded] =
    await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.payment.aggregate({
        where: { status: 'REFUNDED' },
        _sum: { refundAmount: true },
        _count: true,
      }),
    ]);

  return {
    totalCount,
    totalPaidAmount: totalPaid._sum.amount || 0,
    totalPaidCount: totalPaid._count,
    pendingCount: totalPending,
    failedCount: totalFailed,
    refundedAmount: totalRefunded._sum.refundAmount || 0,
    refundedCount: totalRefunded._count,
  };
}
}