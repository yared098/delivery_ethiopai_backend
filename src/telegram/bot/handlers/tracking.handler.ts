import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { t } from '../../i18n/telegram.i18n';
import { BotContext } from '../bot-context';
import { TelegramAccountHandler } from './account.handler';
import { formatOrderCard, formatTrackingCard, OrderCardView } from '../format';
import { backToMenuKeyboard, mainMenuKeyboard } from '../keyboards';

@Injectable()
export class TelegramTrackingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly account: TelegramAccountHandler,
  ) {}

  async promptForNumber(ctx: BotContext): Promise<void> {
    await ctx.say(t(ctx.lang, 'trackAsk'));
  }

  async track(ctx: BotContext, reference: string): Promise<void> {
    const reference_ = reference.trim();
    if (!reference_) {
      await this.promptForNumber(ctx);
      return;
    }

    const customer = await this.account.findCustomer(ctx.chatId);

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ trackingNumber: reference_ }, { trackingToken: reference_ }],
      },
      include: {
        courier: { select: { name: true, phone: true } },
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!order) {
      await ctx.say(
        t(ctx.lang, 'trackNotFound', { number: reference_ }),
        mainMenuKeyboard(ctx.lang),
      );
      return;
    }

    const view = toCardView(order);
    const isOwner =
      !!customer &&
      (order.senderId === customer.id || order.receiverId === customer.id);

    await ctx.say(
      isOwner ? formatOrderCard(view, ctx.lang) : formatTrackingCard(view, ctx.lang),
      backToMenuKeyboard(ctx.lang),
    );
  }
}

type OrderWithRelations = {
  id: string;
  trackingNumber: string;
  status: OrderCardView['status'];
  senderName: string;
  senderPhone: string;
  receiverName: string | null;
  receiverPhone: string;
  deliveryFee: number;
  totalWeightKg: number;
  trackingUrl: string | null;
  createdAt: Date;
  courier: { name: string; phone: string | null } | null;
  events: Array<{ status: OrderCardView['status']; note: string | null; createdAt: Date }>;
};

export function toCardView(order: OrderWithRelations): OrderCardView {
  return {
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
}
