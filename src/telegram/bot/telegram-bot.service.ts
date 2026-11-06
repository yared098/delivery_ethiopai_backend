import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TelegramApiService,
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramUpdate,
} from '../telegram-api.service';
import { TelegramSessionService } from '../telegram-session.service';
import {
  BOT_COMMANDS,
  CALLBACK_DATA,
  TELEGRAM_POLL_BACKOFF_MS,
} from '../telegram.constants';
import { DEFAULT_LANG, isLang, Lang, t } from '../i18n/telegram.i18n';
import { BotContext } from './bot-context';
import { mainMenuKeyboard, resolveMenuAction } from './keyboards';
import { TelegramAccountHandler } from './handlers/account.handler';
import { TelegramOrdersHandler } from './handlers/orders.handler';
import { TelegramTrackingHandler } from './handlers/tracking.handler';

const COMMAND_ALIASES: Record<string, string> = {
  start: 'start',
  menu: 'start',
  help: 'help',
  register: 'register',
  link: 'link',
  unlink: 'unlink',
  me: 'account',
  account: 'account',
  neworder: 'neworder',
  order: 'neworder',
  orders: 'orders',
  myorders: 'orders',
  track: 'track',
  language: 'language',
  cancel: 'cancel',
};

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private offset = 0;
  private polling = false;
  private stopRequested = false;

  constructor(
    private readonly config: ConfigService,
    private readonly api: TelegramApiService,
    private readonly sessions: TelegramSessionService,
    private readonly account: TelegramAccountHandler,
    private readonly orders: TelegramOrdersHandler,
    private readonly tracking: TelegramTrackingHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.api.isConfigured) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured — Telegram bot disabled');
      return;
    }

    await this.api.setMyCommands(BOT_COMMANDS);

    if (this.config.get<string>('TELEGRAM_POLLING') === 'true') {
      void this.startPolling();
    } else {
      this.logger.log('Telegram bot in webhook mode (POST /api/v1/telegram/webhook)');
    }
  }

  onModuleDestroy(): void {
    this.stopRequested = true;
  }

  // ══════════════════════════════════════════════════
  // TRANSPORT
  // ══════════════════════════════════════════════════
  private async startPolling(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    const me = await this.api.getMe();
    this.logger.log(`Telegram bot @${me?.username ?? 'unknown'} polling started`);

    while (!this.stopRequested) {
      const updates = await this.api.getUpdates(this.offset, 25);
      if (updates.length === 0) {
        await delay(TELEGRAM_POLL_BACKOFF_MS);
        continue;
      }
      for (const update of updates) {
        this.offset = update.update_id + 1;
        await this.handleUpdate(update);
      }
    }
    this.polling = false;
    this.logger.log('Telegram bot polling stopped');
  }

  /** Entry point for both long-polling and the webhook controller. */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.callback_query) {
        await this.handleCallback(update.callback_query);
        return;
      }
      const message = update.message ?? update.edited_message;
      if (message) await this.handleMessage(message);
    } catch (err: unknown) {
      this.logger.error(
        `Telegram update ${update.update_id} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ══════════════════════════════════════════════════
  // MESSAGES
  // ══════════════════════════════════════════════════
  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = String(message.chat.id);
    const text = message.text?.trim();
    if (!text) return;

    const ctx = this.buildContext(chatId);

    if (text.startsWith('/')) {
      await this.handleCommand(ctx, text);
      return;
    }

    // A wizard step consumes the text first, except for menu buttons.
    const menuAction = resolveMenuAction(text);
    if (menuAction) {
      this.sessions.reset(chatId);
      await this.runMenuAction(ctx, menuAction);
      return;
    }

    const consumed =
      (await this.account.handleStep(ctx, text)) ||
      (await this.orders.handleStep(ctx, text));

    if (consumed) return;

    if (this.sessions.get(chatId).step === 'track:number') {
      this.sessions.reset(chatId);
      await this.tracking.track(ctx, text);
      return;
    }

    await ctx.say(t(ctx.lang, 'unknownCommand'), mainMenuKeyboard(ctx.lang));
  }

  private async handleCommand(ctx: BotContext, raw: string): Promise<void> {
    const [commandPart, ...args] = raw.split(/\s+/);
    const command = commandPart.replace(/^\//, '').split('@')[0].toLowerCase();
    const action = COMMAND_ALIASES[command];

    if (action !== 'cancel') this.sessions.reset(ctx.chatId);

    switch (action) {
      case 'start':
        await this.sendWelcome(ctx);
        return;
      case 'help':
        await ctx.say(t(ctx.lang, 'help'), mainMenuKeyboard(ctx.lang));
        return;
      case 'register':
        await this.account.beginRegister(ctx);
        return;
      case 'link':
        if (args[0]) {
          await this.account.link(ctx, args[0]);
          return;
        }
        await ctx.say('Usage: /link 0912345678');
        return;
      case 'unlink':
        await this.account.unlink(ctx);
        return;
      case 'account':
        await this.account.showProfile(ctx);
        return;
      case 'neworder':
        await this.orders.startNewOrder(ctx);
        return;
      case 'orders':
        await this.orders.listOrders(ctx, 1);
        return;
      case 'track':
        if (args[0]) {
          await this.tracking.track(ctx, args[0]);
          return;
        }
        this.sessions.setStep(ctx.chatId, 'track:number');
        await this.tracking.promptForNumber(ctx);
        return;
      case 'language':
        await this.showLanguagePicker(ctx);
        return;
      case 'cancel':
        this.sessions.reset(ctx.chatId);
        await ctx.say(t(ctx.lang, 'cancelled'), mainMenuKeyboard(ctx.lang));
        return;
      default:
        await ctx.say(t(ctx.lang, 'unknownCommand'), mainMenuKeyboard(ctx.lang));
    }
  }

  private async sendWelcome(ctx: BotContext): Promise<void> {
    const customer = await this.account.findCustomer(ctx.chatId);
    const lines = [t(ctx.lang, 'welcome')];
    if (customer) {
      lines.push('', t(ctx.lang, 'welcomeBack', { name: customer.name ?? 'customer' }));
    }
    lines.push('', t(ctx.lang, 'mainMenu'));
    await ctx.say(lines.join('\n'), mainMenuKeyboard(ctx.lang));
  }

  private async showLanguagePicker(ctx: BotContext): Promise<void> {
    await ctx.say(t(ctx.lang, 'languageTitle'), {
      inline_keyboard: [
        [
          { text: 'English', callback_data: `${CALLBACK_DATA.language}:en` },
          { text: 'አማርኛ', callback_data: `${CALLBACK_DATA.language}:am` },
        ],
      ],
    });
  }

  private async runMenuAction(ctx: BotContext, action: string): Promise<void> {
    switch (action) {
      case 'btn.newOrder':
        await this.orders.startNewOrder(ctx);
        return;
      case 'btn.orders':
        await this.orders.listOrders(ctx, 1);
        return;
      case 'btn.track':
        this.sessions.setStep(ctx.chatId, 'track:number');
        await this.tracking.promptForNumber(ctx);
        return;
      case 'btn.account':
        await this.account.showProfile(ctx);
        return;
      case 'btn.language':
        await this.showLanguagePicker(ctx);
        return;
      case 'btn.help':
        await ctx.say(t(ctx.lang, 'help'), mainMenuKeyboard(ctx.lang));
        return;
      case 'btn.skip':
        await ctx.say(t(ctx.lang, 'mainMenu'), mainMenuKeyboard(ctx.lang));
        return;
      case 'btn.register':
        await this.account.beginRegister(ctx);
        return;
      default:
        await ctx.say(t(ctx.lang, 'mainMenu'), mainMenuKeyboard(ctx.lang));
    }
  }

  // ══════════════════════════════════════════════════
  // CALLBACKS (inline buttons)
  // ══════════════════════════════════════════════════
  private async handleCallback(query: TelegramCallbackQuery): Promise<void> {
    const chatId = String(query.message?.chat.id ?? query.from.id);
    const ctx = this.buildContext(chatId);
    const data = query.data ?? '';
    const [prefix, payload] = data.split(':');

    await this.api.answerCallbackQuery(query.id);

    switch (prefix) {
      case CALLBACK_DATA.language:
        if (isLang(payload)) {
          this.sessions.setLang(chatId, payload);
          await ctx.say(t(payload, 'languageSet'), mainMenuKeyboard(payload));
        }
        return;
      case CALLBACK_DATA.newOrder:
        this.sessions.reset(chatId);
        await this.orders.startNewOrder(this.buildContext(chatId));
        return;
      case CALLBACK_DATA.ordersPage:
        await this.orders.listOrders(this.buildContext(chatId), Number(payload) || 1);
        return;
      case CALLBACK_DATA.orderView:
        if (payload) await this.orders.showOrder(this.buildContext(chatId), payload);
        return;
      case CALLBACK_DATA.payParty:
        if (payload === 'SENDER' || payload === 'RECEIVER') {
          await this.orders.setPaymentParty(this.buildContext(chatId), payload);
        }
        return;
      case CALLBACK_DATA.confirmOrder:
        await this.orders.confirmOrder(this.buildContext(chatId));
        return;
      case CALLBACK_DATA.cancelFlow:
        this.sessions.reset(chatId);
        await ctx.say(t(ctx.lang, 'cancelled'), mainMenuKeyboard(ctx.lang));
        return;
      case CALLBACK_DATA.help:
        await ctx.say(t(ctx.lang, 'help'), mainMenuKeyboard(ctx.lang));
        return;
      default:
        await ctx.say(t(ctx.lang, 'unknownCommand'), mainMenuKeyboard(ctx.lang));
    }
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════
  private buildContext(chatId: string): BotContext {
    const session = this.sessions.get(chatId);
    const lang: Lang = isLang(session.lang) ? session.lang : DEFAULT_LANG;
    return {
      chatId,
      lang,
      say: (text: string, keyboard?: Record<string, unknown>) =>
        this.api.sendMessage(chatId, text, keyboard),
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
