import { Injectable, Logger } from '@nestjs/common';
import { AccountType, Customer, PaymentParty } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrdersService } from '../../../orders/orders.service';
import { PricingService } from '../../../orders/pricing.service';
import { CreateOrderDto } from '../../../orders/dto/create-order.dto';
import {
  TelegramSessionService,
  PaymentPartyChoice,
  SessionData,
} from '../../telegram-session.service';
import { t } from '../../i18n/telegram.i18n';
import { normalizeEthiopianPhone, toLocalPhone } from '../../../common/utils/phone.util';
import { BotContext } from '../bot-context';
import { TelegramAccountHandler } from './account.handler';
import {
  confirmOrderKeyboard,
  mainMenuKeyboard,
  ORDERS_PER_PAGE,
  orderCardKeyboard,
  ordersListKeyboard,
  paymentPartyKeyboard,
  REMOVE_KEYBOARD,
} from '../keyboards';
import { formatMoney, formatOrderCard, formatOrderListLine, OrderCardView } from '../format';

const MIN_ITEM_LENGTH = 2;
const MIN_WEIGHT_KG = 0.01;
const MAX_WEIGHT_KG = 5_000;

@Injectable()
export class TelegramOrdersHandler {
  private readonly logger = new Logger(TelegramOrdersHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly pricing: PricingService,
    private readonly sessions: TelegramSessionService,
    private readonly account: TelegramAccountHandler,
  ) {}

  // ══════════════════════════════════════════════════
  // WIZARD
  // ══════════════════════════════════════════════════
  async startNewOrder(ctx: BotContext): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    this.sessions.setStep(ctx.chatId, 'order:receiver_name', {
      receiverName: undefined,
      receiverPhone: undefined,
      itemDescription: undefined,
      weightKg: undefined,
      paymentParty: 'SENDER',
    });
    await ctx.say(t(ctx.lang, 'orderAskReceiverName'), REMOVE_KEYBOARD);
  }

  async handleStep(ctx: BotContext, text: string): Promise<boolean> {
    const session = this.sessions.get(ctx.chatId);

    switch (session.step) {
      case 'order:receiver_name': {
        if (text.trim().length < MIN_ITEM_LENGTH) {
          await ctx.say(t(ctx.lang, 'invalidName'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:receiver_phone', {
          receiverName: text.trim(),
        });
        await ctx.say(t(ctx.lang, 'orderAskReceiverPhone'));
        return true;
      }

      case 'order:receiver_phone': {
        const phone = normalizeEthiopianPhone(text);
        if (!phone) {
          await ctx.say(t(ctx.lang, 'invalidPhone'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:item', { receiverPhone: phone });
        await ctx.say(t(ctx.lang, 'orderAskItem'));
        return true;
      }

      case 'order:item': {
        if (text.trim().length < MIN_ITEM_LENGTH) {
          await ctx.say(t(ctx.lang, 'invalidItem'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:weight', {
          itemDescription: text.trim(),
        });
        await ctx.say(t(ctx.lang, 'orderAskWeight'));
        return true;
      }

      case 'order:weight': {
        const weight = Number.parseFloat(text.replace(',', '.'));
        if (!Number.isFinite(weight) || weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) {
          await ctx.say(t(ctx.lang, 'invalidWeight'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:payment', { weightKg: weight });
        await ctx.say(t(ctx.lang, 'orderAskPaymentParty'), paymentPartyKeyboard(ctx.lang));
        return true;
      }

      default:
        return false;
    }
  }

  async setPaymentParty(ctx: BotContext, party: PaymentPartyChoice): Promise<void> {
    this.sessions.patchData(ctx.chatId, { paymentParty: party });
    this.sessions.setStep(ctx.chatId, 'order:confirm');

    const data = this.sessions.get(ctx.chatId).data;
    const estimate = this.pricing.calculate({
      distanceKm: 0,
      totalWeightKg: data.weightKg ?? 0,
      items: [{ type: 'OTHER', quantity: 1 }],
    }).total;

    const lines = [
      t(ctx.lang, 'orderConfirmTitle'),
      '',
      `${t(ctx.lang, 'receiverLabel')}: ${data.receiverName ?? '-'}`,
      `${t(ctx.lang, 'phoneLabel')}: ${data.receiverPhone ? toLocalPhone(data.receiverPhone) : '-'}`,
      `${t(ctx.lang, 'weightLabel')}: ${data.weightKg ?? 0} kg`,
      `${t(ctx.lang, 'feeLabel')}: ${t(ctx.lang, 'estimateFrom', { fee: formatMoney(estimate) })}`,
      '',
      t(ctx.lang, 'orderConfirmHint'),
    ];
    await ctx.say(lines.join('\n'), confirmOrderKeyboard(ctx.lang));
  }

  async confirmOrder(ctx: BotContext): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    const session = this.sessions.get(ctx.chatId);
    const data = session.data;
    if (
      !data.receiverName ||
      !data.receiverPhone ||
      !data.itemDescription ||
      !data.weightKg
    ) {
      this.sessions.reset(ctx.chatId);
      await ctx.say(t(ctx.lang, 'unknownCommand'), mainMenuKeyboard(ctx.lang));
      return;
    }

    this.sessions.reset(ctx.chatId);
    const dto = this.buildOrderDto(customer, data);

    try {
      const result = await this.orders.create(dto, {
        id: customer.id,
        name: customer.name ?? 'Customer',
        accountType: AccountType.CUSTOMER,
        role: 'CUSTOMER',
      });

      const order = result.order;
      if (!order) {
        await ctx.say(t(ctx.lang, 'orderCreateFailed', { reason: 'order not persisted' }));
        return;
      }

      await ctx.say(
        t(ctx.lang, 'orderCreated', {
          tracking: order.trackingNumber,
          fee: formatMoney(order.deliveryFee),
        }),
        mainMenuKeyboard(ctx.lang),
      );
    } catch (err: unknown) {
      this.logger.error(
        `Telegram order creation failed for customer ${customer.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await ctx.say(
        t(ctx.lang, 'orderCreateFailed', {
          reason: err instanceof Error ? err.message : 'unknown error',
        }),
        mainMenuKeyboard(ctx.lang),
      );
    }
  }

  private buildOrderDto(customer: Customer, data: SessionData): CreateOrderDto {
    return {
      sender: {
        customerId: customer.id,
        name: customer.name ?? 'Customer',
        phone: customer.phone,
        address: customer.defaultAddress ?? undefined,
        lat: customer.defaultLat ?? undefined,
        lng: customer.defaultLng ?? undefined,
      },
      receiver: {
        name: data.receiverName as string,
        phone: data.receiverPhone as string,
      },
      items: [
        {
          description: data.itemDescription as string,
          weightKg: data.weightKg as number,
          quantity: 1,
        },
      ],
      paymentParty:
        data.paymentParty === 'RECEIVER' ? PaymentParty.RECEIVER : PaymentParty.SENDER,
      sendReceiverLink: true,
      autoAssignCourier: false,
    };
  }

  // ══════════════════════════════════════════════════
  // LIST / DETAIL
  // ══════════════════════════════════════════════════
  async listOrders(ctx: BotContext, page = 1): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const where = {
      OR: [{ senderId: customer.id }, { receiverId: customer.id }],
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * ORDERS_PER_PAGE,
        take: ORDERS_PER_PAGE,
        select: {
          id: true,
          trackingNumber: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    if (total === 0) {
      await ctx.say(t(ctx.lang, 'noOrders'), mainMenuKeyboard(ctx.lang));
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
    const header = [
      t(ctx.lang, 'ordersTitle'),
      t(ctx.lang, 'ordersPageOf', { page: safePage, pages: totalPages }),
      '',
    ];
    const body = orders.map((order) => formatOrderListLine(order, ctx.lang)).join('\n');

    await ctx.say(
      `${header.join('\n')}\n${body}`,
      ordersListKeyboard(orders, safePage, totalPages, ctx.lang),
    );
  }

  async showOrder(ctx: BotContext, orderId: string): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ senderId: customer.id }, { receiverId: customer.id }],
      },
      include: {
        courier: { select: { name: true, phone: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!order) {
      await ctx.say(t(ctx.lang, 'noOrders'), mainMenuKeyboard(ctx.lang));
      return;
    }

    const view: OrderCardView = {
      id: order.id,
      trackingNumber: order.trackingNumber,
      status: order.status,
      senderName: order.senderName,
      senderPhone: order.senderPhone,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      deliveryFee: order.deliveryFee,
      totalWeightKg: order.totalWeightKg,
      trackingUrl: order.trackingUrl,
      courierName: order.courier?.name ?? null,
      courierPhone: order.courier?.phone ?? null,
      createdAt: order.createdAt,
      events: order.events.map((event) => ({
        status: event.status,
        note: event.note,
        createdAt: event.createdAt,
      })),
    };

    await ctx.say(
      formatOrderCard(view, ctx.lang),
      orderCardKeyboard(order.id, order.trackingUrl, ctx.lang),
    );
  }
}
