import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramApiService } from './telegram-api.service';
import { DEFAULT_LANG, statusLabel, t } from './i18n/telegram.i18n';

export interface OrderStatusNotifyPayload {
  id: string;
  trackingNumber: string;
  status: OrderStatus;
  senderId?: string | null;
  receiverId?: string | null;
}

/**
 * Outbound Telegram pushes, so a customer who linked Telegram also gets order
 * updates there and not only by SMS / mobile push.
 */
@Injectable()
export class TelegramNotifierService {
  private readonly logger = new Logger(TelegramNotifierService.name);

  constructor(
    private readonly api: TelegramApiService,
    private readonly prisma: PrismaService,
  ) {}

  async notifyCustomerId(customerId: string | null | undefined, text: string): Promise<boolean> {
    if (!customerId) return false;
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { telegramId: true },
    });
    if (!customer?.telegramId) return false;
    await this.api.sendMessage(customer.telegramId, text);
    return true;
  }

  async notifyChat(chatId: string | number, text: string): Promise<void> {
    await this.api.sendMessage(chatId, text);
  }

  async notifyOrderStatus(payload: OrderStatusNotifyPayload): Promise<void> {
    if (!this.api.isConfigured) return;

    const text = t(DEFAULT_LANG, 'orderStatusPush', {
      tracking: payload.trackingNumber,
      status: statusLabel(DEFAULT_LANG, payload.status),
    });

    const recipientIds = new Set<string>();
    if (payload.senderId) recipientIds.add(payload.senderId);
    if (payload.receiverId) recipientIds.add(payload.receiverId);
    if (recipientIds.size === 0) return;

    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          id: { in: Array.from(recipientIds) },
          telegramId: { not: null },
        },
        select: { telegramId: true },
      });

      await Promise.all(
        customers.map((customer) =>
          this.api.sendMessage(customer.telegramId as string, text),
        ),
      );
    } catch (err: unknown) {
      this.logger.error(
        `Telegram order status push failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
