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
  'yades.dev@gmail.com';   // ← valid domain, Chapa accepts it
    const firstName = dto.firstName || payer?.name?.split(' ')[0] || 'Customer';
    const lastName =
      dto.lastName || payer?.name?.split(' ').slice(1).join(' ') || 'User';
    const phone = dto.phone || payer?.phone || order.senderPhone;
    const APP_URL = process.env.APP_URL || 'http://localhost:5174';


    const webhookUrl =
  provider.webhookUrl ||
  `${APP_URL}/api/v1/payments/chapa/webhook`;

const returnUrl =
  dto.returnUrl ||
  `${APP_URL}/payment/success?tx_ref=${txRef}`;

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

    // Chapa sends tx_ref at top level or nested
    const txRef =
      body?.tx_ref || body?.trx_ref || body?.data?.tx_ref || body?.reference;

    if (!txRef) {
      this.logger.warn('Chapa webhook: no tx_ref found');
      return { ok: true };
    }

    // ALWAYS re-verify server-side — never trust webhook body alone
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
  // REFUND (manual record — Chapa refund API optional)
  // ══════════════════════════════════════════════════
  async markRefunded(
    paymentId: string,
    reason: string,
    amount?: number,
    staffId?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID)
      throw new BadRequestException('Only PAID payments can be refunded');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount: amount ?? payment.amount,
        refundReason: reason,
        createdById: staffId,
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });

    return { message: 'Payment marked as refunded' };
  }
}