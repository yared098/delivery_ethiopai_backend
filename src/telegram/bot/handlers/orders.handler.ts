import { Injectable, Logger } from '@nestjs/common';
import { AccountType, Customer, PaymentParty } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrdersService } from '../../../orders/orders.service';
import { PricingService } from '../../../orders/pricing.service';
import { QrService } from '../../../qr/qr.service';
import { TelegramApiService, TelegramMessage } from '../../telegram-api.service';
import { TelegramWebAppService } from '../../webapp/telegram-webapp.service';
import { CreateOrderDto } from '../../../orders/dto/create-order.dto';
import {
  TelegramSessionService,
  PaymentPartyChoice,
  SessionData,
} from '../../telegram-session.service';
import { statusLabel, t } from '../../i18n/telegram.i18n';
import { normalizeEthiopianPhone, toLocalPhone } from '../../../common/utils/phone.util';
import { compressImage } from '../../../common/utils/image.util';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { BotContext } from '../bot-context';
import { TelegramAccountHandler } from './account.handler';
import {
  confirmOrderKeyboard,
  mainMenuKeyboard,
  newOrderChoiceKeyboard,
  ORDERS_PER_PAGE,
  orderCardKeyboard,
  ordersListKeyboard,
  paymentPartyKeyboard,
  REMOVE_KEYBOARD,
  resolveMenuAction,
  shareLocationKeyboard,
  skipStepKeyboard,
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
    private readonly qrService: QrService,
    private readonly telegramApi: TelegramApiService,
    private readonly webApp: TelegramWebAppService,
  ) {}

  // ══════════════════════════════════════════════════
  // WIZARD
  // ══════════════════════════════════════════════════
  async startNewOrder(ctx: BotContext): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    // Let the sender choose: open the Telegram Mini App (web form) or use the
    // step-by-step chat wizard. Opening the web app is optional.
    const orderFormUrl = `${this.webApp.webAppUrl}/api/v1/telegram/webapp/order-form`;
    await this.clearAndSay(ctx, 
      t(ctx.lang, 'createOrderChoose'),
      newOrderChoiceKeyboard(ctx.lang, orderFormUrl),
    );
  }

  /** Start the step-by-step chat wizard for creating an order. */
  async startOrderWizard(ctx: BotContext): Promise<void> {
    this.sessions.setStep(ctx.chatId, 'order:receiver_name', {
      receiverName: undefined,
      receiverPhone: undefined,
      itemDescription: undefined,
      photoUrl: undefined,
      weightKg: undefined,
      paymentParty: 'SENDER',
      senderLat: undefined,
      senderLng: undefined,
      senderAddress: undefined,
      items: [],
    });
    await this.clearAndSay(ctx, t(ctx.lang, 'orderAskReceiverName'), REMOVE_KEYBOARD);
  }

  async handleStep(
    ctx: BotContext,
    text: string,
    message?: TelegramMessage,
  ): Promise<boolean> {
    const session = this.sessions.get(ctx.chatId);

    switch (session.step) {
      case 'order:receiver_name': {
        if (text.trim().length < MIN_ITEM_LENGTH) {
          await this.clearAndSay(ctx, t(ctx.lang, 'invalidName'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:receiver_phone', {
          receiverName: text.trim(),
        });
        await this.clearAndSay(ctx, t(ctx.lang, 'orderAskReceiverPhone'));
        return true;
      }

      case 'order:receiver_phone': {
        const phone = normalizeEthiopianPhone(text);
        if (!phone) {
          await this.clearAndSay(ctx, t(ctx.lang, 'invalidPhone'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:item', { receiverPhone: phone });
        await this.clearAndSay(ctx, t(ctx.lang, 'orderAskItem'));
        return true;
      }

      case 'order:item': {
        if (text.trim().length < MIN_ITEM_LENGTH) {
          await this.clearAndSay(ctx, t(ctx.lang, 'invalidItem'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:photo', {
          itemDescription: text.trim(),
        });
        await this.clearAndSay(ctx, t(ctx.lang, 'orderAskPhoto'), skipStepKeyboard(ctx.lang));
        return true;
      }

      case 'order:photo': {
        const trimmed = text.trim();
        const isSkip =
          trimmed.toLowerCase() === 'skip' ||
          resolveMenuAction(trimmed) === 'btn.skip';

        if (isSkip) {
          this.sessions.setStep(ctx.chatId, 'order:weight');
          await this.clearAndSay(ctx, t(ctx.lang, 'orderAskWeight'), REMOVE_KEYBOARD);
          return true;
        }

        // Check for photo or image document in message
        const photo =
          message?.photo && message.photo.length > 0
            ? message.photo[message.photo.length - 1]
            : null;

        const isImageDoc =
          message?.document?.mime_type?.startsWith('image/') ||
          /\.(jpe?g|png|webp|heic)$/i.test(message?.document?.file_name ?? '');

        const fileId =
          photo?.file_id ?? (isImageDoc ? message?.document?.file_id : null);

        if (!fileId) {
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderAskPhotoInvalid'),
            skipStepKeyboard(ctx.lang),
          );
          return true;
        }

        await this.clearAndSay(ctx, t(ctx.lang, 'orderPhotoUploading'));

        const fileInfo = await this.telegramApi.getFile(fileId);
        if (!fileInfo?.file_path) {
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderPhotoUploadFailed'),
            skipStepKeyboard(ctx.lang),
          );
          return true;
        }

        const rawBuffer = await this.telegramApi.downloadFile(fileInfo.file_path);
        if (!rawBuffer) {
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderPhotoUploadFailed'),
            skipStepKeyboard(ctx.lang),
          );
          return true;
        }

        try {
          // Compress image to strictly <= 2MB
          const compressed = await compressImage(rawBuffer, 2 * 1024 * 1024);

          const uploadDir = join(process.cwd(), 'uploads', 'orders');
          mkdirSync(uploadDir, { recursive: true });

          const filename = `${randomUUID()}.jpg`;
          const filePath = join(uploadDir, filename);
          writeFileSync(filePath, compressed);

          const photoUrl = `/uploads/orders/${filename}`;
          this.sessions.setStep(ctx.chatId, 'order:weight', { photoUrl });

          const sizeKb = Math.round(compressed.length / 1024);
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderPhotoUploaded', { size: `${sizeKb} KB` }),
            REMOVE_KEYBOARD,
          );
          await this.clearAndSay(ctx, t(ctx.lang, 'orderAskWeight'));
          return true;
        } catch (err: unknown) {
          this.logger.error(
            `Photo compression or upload failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderPhotoUploadFailed'),
            skipStepKeyboard(ctx.lang),
          );
          return true;
        }
      }

      case 'order:weight': {
        const weight = Number.parseFloat(text.replace(',', '.'));
        if (
          !Number.isFinite(weight) ||
          weight < MIN_WEIGHT_KG ||
          weight > MAX_WEIGHT_KG
        ) {
          await this.clearAndSay(ctx, t(ctx.lang, 'invalidWeight'));
          return true;
        }
        this.sessions.setStep(ctx.chatId, 'order:add_more', { weightKg: weight });
        await this.clearAndSay(ctx, 
          t(ctx.lang, 'orderAskAddMoreItem'),
          {
            keyboard: [[
              { text: t(ctx.lang, 'btn.addAnother') },
              { text: t(ctx.lang, 'btn.finishItems') },
            ]],
            resize_keyboard: true,
            one_time_keyboard: true,
            is_persistent: false,
          },
        );
        return true;
      }

      case 'order:add_more': {
        const trimmed = text.trim();
        const isAddAnother =
          trimmed.toLowerCase() === t(ctx.lang, 'btn.addAnother').toLowerCase() ||
          trimmed === t(ctx.lang, 'btn.addAnother');
        const isFinish =
          trimmed.toLowerCase() === t(ctx.lang, 'btn.finishItems').toLowerCase() ||
          trimmed === t(ctx.lang, 'btn.finishItems');

        if (!isAddAnother && !isFinish) {
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderAskAddMoreItem'),
            {
              keyboard: [[
                { text: t(ctx.lang, 'btn.addAnother') },
                { text: t(ctx.lang, 'btn.finishItems') },
              ]],
              resize_keyboard: true,
              one_time_keyboard: true,
              is_persistent: false,
            },
          );
          return true;
        }

        // Save the current item to the items array
        const session = this.sessions.get(ctx.chatId);
        const data = session.data;
        const currentItem = {
          description: data.itemDescription as string,
          weightKg: data.weightKg as number,
          photoUrl: data.photoUrl as string | undefined,
          quantity: 1,
        };

        const items = [...(data.items ?? []), currentItem];

        if (isAddAnother) {
          // Clear temp fields for the next item and loop back
          this.sessions.setStep(ctx.chatId, 'order:item', {
            items,
            itemDescription: undefined,
            photoUrl: undefined,
            weightKg: undefined,
          });
          await this.clearAndSay(ctx, t(ctx.lang, 'orderAskItem'), REMOVE_KEYBOARD);
          return true;
        }

        // Finish adding items — proceed to sender location
        this.sessions.setStep(ctx.chatId, 'order:sender_location', { items });
        await this.clearAndSay(ctx, 
          t(ctx.lang, 'orderAskSenderLocation'),
          shareLocationKeyboard(ctx.lang),
        );
        return true;
      }

      case 'order:sender_location': {
        // Handle native Telegram location share
        if (message?.location) {
          const { latitude, longitude } = message.location;
          this.sessions.setStep(ctx.chatId, 'order:payment', {
            senderLat: latitude,
            senderLng: longitude,
          });
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderSenderLocationReceived'),
            REMOVE_KEYBOARD,
          );
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderAskPaymentParty'),
            paymentPartyKeyboard(ctx.lang),
          );
          return true;
        }

        // Handle Skip / Cancel text buttons
        const trimmed = text.trim();
        const action = resolveMenuAction(trimmed);
        const isSkip =
          trimmed.toLowerCase() === 'skip' || action === 'btn.skip';
        const isCancel =
          trimmed.toLowerCase() === 'cancel' || action === 'btn.cancel';

        if (isCancel) {
          this.sessions.reset(ctx.chatId);
          await this.clearAndSay(ctx, t(ctx.lang, 'cancelled'), mainMenuKeyboard(ctx.lang));
          return true;
        }

        if (isSkip) {
          this.sessions.setStep(ctx.chatId, 'order:payment');
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderSenderLocationSkipped'),
            REMOVE_KEYBOARD,
          );
          await this.clearAndSay(ctx, 
            t(ctx.lang, 'orderAskPaymentParty'),
            paymentPartyKeyboard(ctx.lang),
          );
          return true;
        }

        // Any other text — remind user to use the button or skip
        await this.clearAndSay(ctx, 
          t(ctx.lang, 'orderAskSenderLocation'),
          shareLocationKeyboard(ctx.lang),
        );
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
    const items = data.items ?? [];
    const totalWeightKg = items.reduce((sum, item) => sum + (item.weightKg ?? 0), 0);

    const estimate = this.pricing.calculate({
      distanceKm: 0,
      totalWeightKg,
      items: items.map((item) => ({
        type: 'OTHER' as const,
        quantity: item.quantity ?? 1,
      })),
    }).total;

    const itemLines = items.map(
      (item, i) =>
        `  ${i + 1}. ${item.description} — ${item.weightKg} kg`,
    ).join('\n');

    const lines = [
      t(ctx.lang, 'orderConfirmTitle'),
      '',
      `${t(ctx.lang, 'receiverLabel')}: ${data.receiverName ?? '-'}`,
      `${t(ctx.lang, 'phoneLabel')}: ${data.receiverPhone ? toLocalPhone(data.receiverPhone) : '-'}`,
      `${t(ctx.lang, 'itemsLabel')}:`,
      itemLines,
      `${t(ctx.lang, 'photoLabel')}: ${
        items.some((it) => it.photoUrl) ? '📸 ' + t(ctx.lang, 'photoAttached') : '-'
      }`,
      `${t(ctx.lang, 'weightLabel')}: ${totalWeightKg.toFixed(2)} kg`,
      `📍 ${t(ctx.lang, 'addressLabel')}: ${
        data.senderLat != null && data.senderLng != null
          ? `${data.senderLat.toFixed(5)}, ${data.senderLng.toFixed(5)}`
          : data.senderAddress ?? t(ctx.lang, 'notSet')
      }`,
      `${t(ctx.lang, 'feeLabel')}: ${t(ctx.lang, 'estimateFrom', { fee: formatMoney(estimate) })}`,
      '',
      t(ctx.lang, 'orderConfirmHint'),
    ];
    await this.clearAndSay(ctx, lines.join('\n'), confirmOrderKeyboard(ctx.lang));
  }

  async confirmOrder(ctx: BotContext): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    const session = this.sessions.get(ctx.chatId);
    const data = session.data;
    if (
      !data.receiverName ||
      !data.receiverPhone ||
      !data.items ||
      data.items.length === 0
    ) {
      this.sessions.reset(ctx.chatId);
      await this.clearAndSay(ctx, t(ctx.lang, 'unknownCommand'), mainMenuKeyboard(ctx.lang));
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
        await this.clearAndSay(ctx, t(ctx.lang, 'orderCreateFailed', { reason: 'order not persisted' }));
        return;
      }

      const successText = t(ctx.lang, 'orderCreated', {
        tracking: order.trackingNumber,
        fee: formatMoney(order.deliveryFee),
      });

      // Send the pickup QR code photo immediately so the customer has it ready for the driver
      const qrResult = await this.qrService.getOrderQrBuffer(order.id).catch(() => null);
      if (qrResult?.buffer) {
        const prompt = `📱 ${t(ctx.lang, 'orderQrPrompt', { tracking: order.trackingNumber })}`;
        const sent = await ctx.sendPhoto(
          qrResult.buffer,
          `${successText}\n\n${prompt}`,
          mainMenuKeyboard(ctx.lang),
        );
        if (sent) return;
      }

      await this.clearAndSay(ctx, 
        successText,
        mainMenuKeyboard(ctx.lang),
      );
    } catch (err: unknown) {
      this.logger.error(
        `Telegram order creation failed for customer ${customer.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await this.clearAndSay(ctx, 
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
        address: data.senderAddress ?? customer.defaultAddress ?? undefined,
        lat: data.senderLat ?? customer.defaultLat ?? undefined,
        lng: data.senderLng ?? customer.defaultLng ?? undefined,
      },
      receiver: {
        name: data.receiverName as string,
        phone: data.receiverPhone as string,
      },
      items: (data.items ?? []).map((item) => ({
        description: item.description,
        weightKg: item.weightKg,
        quantity: item.quantity ?? 1,
        photoUrl: item.photoUrl,
      })),
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
      await this.clearAndSay(ctx, t(ctx.lang, 'noOrders'), mainMenuKeyboard(ctx.lang));
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
    const header = [
      t(ctx.lang, 'ordersTitle'),
      t(ctx.lang, 'ordersPageOf', { page: safePage, pages: totalPages }),
      '',
    ];
    const body = orders.map((order) => formatOrderListLine(order, ctx.lang)).join('\n');

    await this.clearAndSay(ctx, 
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
        items: true,
        courier: { select: { name: true, phone: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!order) {
      await this.clearAndSay(ctx, t(ctx.lang, 'noOrders'), mainMenuKeyboard(ctx.lang));
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
      itemDescription: order.items[0]?.description ?? null,
      photoUrl: order.items[0]?.photoUrl ?? null,
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

    const cardText = formatOrderCard(view, ctx.lang);
    const keyboard = orderCardKeyboard(order.id, order.trackingUrl, ctx.lang);

    // Provide the QR code photo for driver pickup scan
    const qrResult = await this.qrService.getOrderQrBuffer(order.id).catch(() => null);
    if (qrResult?.buffer) {
      const prompt = `📱 ${t(ctx.lang, 'orderQrPrompt', { tracking: order.trackingNumber })}`;
      const caption = `${cardText}\n\n${prompt}`;
      const sent = await ctx.sendPhoto(qrResult.buffer, caption, keyboard);
      if (sent) return;
    }

    await this.clearAndSay(ctx, cardText, keyboard);
  }

  /**
   * Display dedicated QR code image for pickup scanning by driver.
   */
  async showOrderQr(ctx: BotContext, orderIdOrRef: string): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    const ref = orderIdOrRef.trim();
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: ref }, { trackingNumber: ref }],
        AND: [
          { OR: [{ senderId: customer.id }, { receiverId: customer.id }] },
        ],
      },
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        receiverName: true,
        receiverPhone: true,
        totalWeightKg: true,
        trackingUrl: true,
      },
    });

    if (!order) {
      await this.clearAndSay(ctx, t(ctx.lang, 'qrCodeNotFound'), mainMenuKeyboard(ctx.lang));
      return;
    }

    try {
      const { buffer } = await this.qrService.getOrderQrBuffer(order.id);
      const lines = [
        `📱 ${t(ctx.lang, 'orderQrPrompt', { tracking: order.trackingNumber })}`,
        '',
        `${t(ctx.lang, 'statusLabel')}: ${statusLabel(ctx.lang, order.status)}`,
        `${t(ctx.lang, 'receiverLabel')}: ${order.receiverName ?? '-'} (${order.receiverPhone})`,
        `${t(ctx.lang, 'weightLabel')}: ${order.totalWeightKg} kg`,
      ];

      const keyboard = orderCardKeyboard(order.id, order.trackingUrl, ctx.lang);
      const sent = await ctx.sendPhoto(buffer, lines.join('\n'), keyboard);
      if (!sent) {
        await this.clearAndSay(ctx, lines.join('\n'), keyboard);
      }
    } catch (err: unknown) {
      this.logger.error(
        `Failed to generate QR for order ${order.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await this.clearAndSay(ctx, t(ctx.lang, 'qrCodeNotFound'), mainMenuKeyboard(ctx.lang));
    }
  }

  /**
   * Show QR code for the user's latest order.
   */
  async showLatestOrderQr(ctx: BotContext): Promise<void> {
    const customer = await this.account.requireCustomer(ctx);
    if (!customer) return;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ senderId: customer.id }, { receiverId: customer.id }],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!order) {
      await this.clearAndSay(ctx, t(ctx.lang, 'noOrders'), mainMenuKeyboard(ctx.lang));
      return;
    }

    await this.showOrderQr(ctx, order.id);
  }
}
