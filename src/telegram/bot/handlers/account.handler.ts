import { Injectable } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TelegramSessionService } from '../../telegram-session.service';
import { t } from '../../i18n/telegram.i18n';
import { normalizeEthiopianPhone } from '../../../common/utils/phone.util';
import { BotContext } from '../bot-context';
import { mainMenuKeyboard, REMOVE_KEYBOARD } from '../keyboards';

@Injectable()
export class TelegramAccountHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: TelegramSessionService,
  ) {}

  async findCustomer(chatId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { telegramId: chatId } });
  }

  /** Returns the linked customer, or replies with the "not registered" hint. */
  async requireCustomer(ctx: BotContext): Promise<Customer | null> {
    const customer = await this.findCustomer(ctx.chatId);
    if (!customer) {
      await ctx.say(t(ctx.lang, 'notRegistered'), mainMenuKeyboard(ctx.lang));
      return null;
    }
    return customer;
  }

  async showProfile(ctx: BotContext): Promise<void> {
    const customer = await this.requireCustomer(ctx);
    if (!customer) return;

    const lines = [
      t(ctx.lang, 'profileTitle'),
      '',
      `${t(ctx.lang, 'nameLabel')}: ${customer.name ?? t(ctx.lang, 'notSet')}`,
      `${t(ctx.lang, 'phoneLabel')}: ${customer.phone}`,
      `${t(ctx.lang, 'addressLabel')}: ${customer.defaultAddress ?? t(ctx.lang, 'notSet')}`,
    ];
    await ctx.say(lines.join('\n'), mainMenuKeyboard(ctx.lang));
  }

  async beginRegister(ctx: BotContext): Promise<void> {
    this.sessions.setStep(ctx.chatId, 'register:name', {
      name: undefined,
      phone: undefined,
      address: undefined,
    });
    await ctx.say(t(ctx.lang, 'askName'), REMOVE_KEYBOARD);
  }

  async unlink(ctx: BotContext): Promise<void> {
    const customer = await this.findCustomer(ctx.chatId);
    if (!customer) {
      await ctx.say(t(ctx.lang, 'noLinkedAccount'));
      return;
    }
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { telegramId: null },
    });
    await ctx.say(t(ctx.lang, 'accountUnlinked'), mainMenuKeyboard(ctx.lang));
  }

  async link(ctx: BotContext, rawPhone: string): Promise<void> {
    const phone = normalizeEthiopianPhone(rawPhone);
    if (!phone) {
      await ctx.say(t(ctx.lang, 'invalidPhone'));
      return;
    }

    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      await ctx.say(t(ctx.lang, 'accountLinkFailed'));
      return;
    }
    if (customer.telegramId && customer.telegramId !== ctx.chatId) {
      await ctx.say(t(ctx.lang, 'accountInUse'));
      return;
    }

    await this.attachTelegram(customer.id, ctx.chatId);
    await ctx.say(
      t(ctx.lang, 'accountLinked', { name: customer.name ?? phone }),
      mainMenuKeyboard(ctx.lang),
    );
  }

  /** Drives the `register:*` steps. Returns true when the text was consumed. */
  async handleStep(ctx: BotContext, text: string): Promise<boolean> {
    const session = this.sessions.get(ctx.chatId);

    if (session.step === 'register:name') {
      if (text.trim().length < 2) {
        await ctx.say(t(ctx.lang, 'invalidName'));
        return true;
      }
      this.sessions.setStep(ctx.chatId, 'register:phone', { name: text.trim() });
      await ctx.say(t(ctx.lang, 'askPhone'));
      return true;
    }

    if (session.step === 'register:phone') {
      const phone = normalizeEthiopianPhone(text);
      if (!phone) {
        await ctx.say(t(ctx.lang, 'invalidPhone'));
        return true;
      }
      this.sessions.setStep(ctx.chatId, 'register:address', { phone });
      await ctx.say(t(ctx.lang, 'askAddress'));
      return true;
    }

    if (session.step === 'register:address') {
      const trimmed = text.trim();
      const address = trimmed.toLowerCase() === 'skip' ? null : trimmed;
      await this.completeRegistration(ctx, address || null);
      return true;
    }

    return false;
  }

  private async completeRegistration(ctx: BotContext, address: string | null): Promise<void> {
    const { name, phone } = this.sessions.get(ctx.chatId).data;
    this.sessions.reset(ctx.chatId);

    if (!name || !phone) {
      await ctx.say(t(ctx.lang, 'registrationFailed', { reason: 'missing data' }));
      return;
    }

    try {
      const existing = await this.prisma.customer.findUnique({ where: { phone } });

      if (existing) {
        if (existing.telegramId && existing.telegramId !== ctx.chatId) {
          await ctx.say(t(ctx.lang, 'accountInUse'));
          return;
        }
        await this.attachTelegram(existing.id, ctx.chatId);
        await ctx.say(
          t(ctx.lang, 'accountLinked', { name: existing.name ?? name }),
          mainMenuKeyboard(ctx.lang),
        );
        return;
      }

      const created = await this.prisma.customer.create({
        data: { name, phone, defaultAddress: address, telegramId: ctx.chatId },
      });

      await ctx.say(
        `${t(ctx.lang, 'registrationDone')}\n\n${t(ctx.lang, 'registeredAs', {
          name: created.name ?? name,
        })}`,
        mainMenuKeyboard(ctx.lang),
      );
    } catch (err: unknown) {
      const reason =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
          ? 'phone or Telegram already registered'
          : err instanceof Error
            ? err.message
            : String(err);
      await ctx.say(t(ctx.lang, 'registrationFailed', { reason }));
    }
  }

  private async attachTelegram(customerId: string, chatId: string): Promise<void> {
    // telegramId is unique: free this chat from any other account first.
    await this.prisma.customer.updateMany({
      where: { telegramId: chatId, NOT: { id: customerId } },
      data: { telegramId: null },
    });
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { telegramId: chatId },
    });
  }
}
