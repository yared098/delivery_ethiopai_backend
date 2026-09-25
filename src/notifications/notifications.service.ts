
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Messaging, Message } from 'firebase-admin/messaging';   // ← REPLACED
import { AccountType, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FIREBASE_MESSAGING } from './firebase.provider';

import {
  ORDER_STATUS_TEMPLATES,
  TEMPLATES,
} from './constants/notification-templates';

export type SendOptions = {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
};

export type OrderNotifyPayload = {
  id: string;
  trackingNumber: string;
  status: OrderStatus;
  senderId?: string | null;
  receiverId?: string | null;
  courierId?: string | null;
  senderAddress?: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
  @Inject(FIREBASE_MESSAGING)
  private readonly messaging: Messaging,   // ← NOW JUST 'Messaging'
  private readonly prisma: PrismaService,
) {}

  // ══════════════════════════════════════════════════
  // 🔹 LOW-LEVEL: single token
  // ══════════════════════════════════════════════════
  async sendToToken(token: string, opts: SendOptions) {
    try {
      const messageId = await this.messaging.send({
        token,
        notification: {
          title: opts.title,
          body: opts.body,
          imageUrl: opts.imageUrl,
        },
        data: opts.data ?? {},
        android: {
          priority: 'high',
          notification: { channelId: 'default', sound: 'default' },
        },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
      return { success: true, messageId };
    } catch (err: any) {
      await this.handleDeadToken(err, token);
      if (err.code !== 'messaging/registration-token-not-registered') {
        this.logger.error(`FCM send error: ${err.message}`);
      }
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════════════
  // 🔹 ACCOUNT: all active devices of one account
  // ══════════════════════════════════════════════════
  async sendToAccount(
    accountType: AccountType,
    accountId: string,
    opts: SendOptions,
  ) {
    const where: any = { accountType, isActive: true };
    if (accountType === 'CUSTOMER') where.customerId = accountId;
    if (accountType === 'COURIER') where.courierId = accountId;
    if (accountType === 'STAFF') where.staffId = accountId;

    const tokens = await this.prisma.deviceToken.findMany({ where });
    if (!tokens.length) {
      this.logger.warn(`No active tokens for ${accountType} ${accountId}`);
      return { success: false, error: 'No tokens' };
    }

    // const messages: admin.messaging.Message[] = tokens.map((t) => ({
    const messages: Message[] = tokens.map((t) => ({

      token: t.token,
      notification: {
        title: opts.title,
        body: opts.body,
        imageUrl: opts.imageUrl,
      },
      data: opts.data ?? {},
      android: {
        priority: 'high',
        notification: { channelId: 'default', sound: 'default' },
      },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    }));

    const res = await this.messaging.sendEach(messages);

    // Deactivate dead tokens
    const dead: string[] = [];
    res.responses.forEach((r, i) => {
      if (
        !r.success &&
        (r.error?.code === 'messaging/registration-token-not-registered' ||
          r.error?.code === 'messaging/invalid-registration-token')
      ) {
        dead.push(tokens[i].token);
      }
    });
    if (dead.length) {
      await this.prisma.deviceToken.updateMany({
        where: { token: { in: dead } },
        data: { isActive: false },
      });
      this.logger.warn(`Deactivated ${dead.length} dead token(s)`);
    }

    return {
      success: true,
      sent: res.successCount,
      failed: res.failureCount,
    };
  }

  // ══════════════════════════════════════════════════
  // 🔹 TOPIC: broadcast
  // ══════════════════════════════════════════════════
  async sendToTopic(topic: string, opts: SendOptions) {
    try {
      const messageId = await this.messaging.send({
        topic,
        notification: { title: opts.title, body: opts.body },
        data: opts.data ?? {},
      });
      return { success: true, messageId };
    } catch (err: any) {
      this.logger.error(`FCM topic error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string) {
    if (!tokens.length) return;
    try {
      await this.messaging.subscribeToTopic(tokens, topic);
    } catch (err: any) {
      this.logger.error(`subscribeToTopic error: ${err.message}`);
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string) {
    if (!tokens.length) return;
    try {
      await this.messaging.unsubscribeFromTopic(tokens, topic);
    } catch (err: any) {
      this.logger.error(`unsubscribeFromTopic error: ${err.message}`);
    }
  }

  // ══════════════════════════════════════════════════
  // 🔔 HIGH-LEVEL TRIGGERS
  // ══════════════════════════════════════════════════

  /** New customer registered / first device */
  async notifyCustomerWelcome(customerId: string, name?: string) {
    const t = TEMPLATES.WELCOME_CUSTOMER;
    return this.sendToAccount('CUSTOMER', customerId, {
      title: t.title,
      body: name ? `Hi ${name}, ${t.body}` : t.body,
      data: { type: 'WELCOME' },
    });
  }

  /** Order status change → sender + receiver (+ courier if ASSIGNED) */
  async notifyOrderStatus(order: OrderNotifyPayload) {
    const template = ORDER_STATUS_TEMPLATES[order.status];
    if (!template) return { success: false, error: 'No template' };

    const data = {
      type: 'ORDER_STATUS',
      orderId: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
    };

    const tasks: Promise<any>[] = [];

    // → Sender
    if (order.senderId) {
      tasks.push(
        this.sendToAccount('CUSTOMER', order.senderId, {
          title: template.title,
          body: `${template.body} (#${order.trackingNumber})`,
          data,
        }),
      );
    }

    // → Receiver (only if linked as Customer)
    if (order.receiverId) {
      tasks.push(
        this.sendToAccount('CUSTOMER', order.receiverId, {
          title: template.title,
          body: `${template.body} (#${order.trackingNumber})`,
          data,
        }),
      );
    }

    // → Courier when assigned
    if (order.status === 'ASSIGNED' && order.courierId) {
      tasks.push(
        this.sendToAccount('COURIER', order.courierId, {
          title: TEMPLATES.NEW_ASSIGNMENT.title,
          body: `Pickup from ${order.senderAddress ?? 'sender'}`,
          data: {
            type: 'NEW_ASSIGNMENT',
            orderId: order.id,
            trackingNumber: order.trackingNumber,
          },
        }),
      );
    }

    const results = await Promise.allSettled(tasks);
    return { success: true, results: results.length };
  }

  /** Courier approved by staff */
  async notifyCourierApproved(courierId: string) {
    const t = TEMPLATES.COURIER_APPROVED;
    return this.sendToAccount('COURIER', courierId, {
      title: t.title,
      body: t.body,
      data: { type: 'ACCOUNT_APPROVED' },
    });
  }

  /** Courier rejected by staff */
  async notifyCourierRejected(courierId: string, reason?: string) {
    const t = TEMPLATES.COURIER_REJECTED;
    return this.sendToAccount('COURIER', courierId, {
      title: t.title,
      body: reason ?? t.body,
      data: { type: 'ACCOUNT_REJECTED' },
    });
  }

  /** Payout sent to courier */
  async notifyPayoutPaid(courierId: string, amount: number, currency = 'ETB') {
    const t = TEMPLATES.PAYOUT_PAID;
    return this.sendToAccount('COURIER', courierId, {
      title: t.title,
      body: `${amount} ${currency} has been sent to your account.`,
      data: { type: 'PAYOUT_PAID', amount: String(amount) },
    });
  }

  /** Receiver link sent (by phone → resolve to customer) */
  async notifyReceiverLink(receiverPhone: string, shortCode: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { phone: receiverPhone },
    });
    if (!customer) return { success: false, error: 'No customer with phone' };

    const t = TEMPLATES.RECEIVER_LINK;
    return this.sendToAccount('CUSTOMER', customer.id, {
      title: t.title,
      body: t.body,
      data: { type: 'RECEIVER_LINK', shortCode },
    });
  }

  // ══════════════════════════════════════════════════
  // 🔧 PRIVATE HELPERS
  // ══════════════════════════════════════════════════
  private async handleDeadToken(err: any, token: string) {
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      await this.prisma.deviceToken.updateMany({
        where: { token },
        data: { isActive: false },
      });
      this.logger.warn(`Deactivated dead token: ${token.slice(0, 20)}...`);
    }
  }
}