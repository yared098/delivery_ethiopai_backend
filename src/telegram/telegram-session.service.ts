import { Injectable } from '@nestjs/common';
import { DEFAULT_LANG, isLang, Lang } from './i18n/telegram.i18n';
import { SESSION_TTL_MS } from './telegram.constants';

export type BotStep =
  | 'idle'
  | 'register:name'
  | 'register:phone'
  | 'register:address'
  | 'order:receiver_name'
  | 'order:receiver_phone'
  | 'order:item'
  | 'order:weight'
  | 'order:payment'
  | 'order:confirm'
  | 'track:number';

export type PaymentPartyChoice = 'SENDER' | 'RECEIVER';

export interface SessionData {
  name?: string;
  phone?: string;
  address?: string;
  receiverName?: string;
  receiverPhone?: string;
  itemDescription?: string;
  weightKg?: number;
  paymentParty?: PaymentPartyChoice;
}

export interface BotSession {
  chatId: string;
  lang: Lang;
  step: BotStep;
  data: SessionData;
  updatedAt: number;
}

const MAX_TRACKED_SESSIONS = 5_000;

/**
 * In-memory conversation state keyed by chat id.
 * Telegram chats are short-lived wizards, so an in-process map is enough and
 * keeps the bot stateless with respect to the database.
 */
@Injectable()
export class TelegramSessionService {
  private readonly sessions = new Map<string, BotSession>();

  get(chatId: string | number): BotSession {
    const key = String(chatId);
    this.pruneIfNeeded();

    const existing = this.sessions.get(key);
    if (!existing) {
      const created: BotSession = {
        chatId: key,
        lang: DEFAULT_LANG,
        step: 'idle',
        data: {},
        updatedAt: Date.now(),
      };
      this.sessions.set(key, created);
      return created;
    }

    if (Date.now() - existing.updatedAt > SESSION_TTL_MS) {
      const reset: BotSession = {
        chatId: key,
        lang: existing.lang,
        step: 'idle',
        data: {},
        updatedAt: Date.now(),
      };
      this.sessions.set(key, reset);
      return reset;
    }

    existing.updatedAt = Date.now();
    return existing;
  }

  setLang(chatId: string | number, lang: Lang): void {
    const session = this.get(chatId);
    session.lang = isLang(lang) ? lang : DEFAULT_LANG;
    session.updatedAt = Date.now();
    this.sessions.set(session.chatId, session);
  }

  setStep(chatId: string | number, step: BotStep, data: SessionData = {}): void {
    const session = this.get(chatId);
    session.step = step;
    session.data = { ...session.data, ...data };
    session.updatedAt = Date.now();
    this.sessions.set(session.chatId, session);
  }

  patchData(chatId: string | number, patch: SessionData): void {
    const session = this.get(chatId);
    session.data = { ...session.data, ...patch };
    session.updatedAt = Date.now();
    this.sessions.set(session.chatId, session);
  }

  reset(chatId: string | number): void {
    const session = this.get(chatId);
    session.step = 'idle';
    session.data = {};
    session.updatedAt = Date.now();
    this.sessions.set(session.chatId, session);
  }

  private pruneIfNeeded(): void {
    if (this.sessions.size < MAX_TRACKED_SESSIONS) return;
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [key, session] of this.sessions) {
      if (session.updatedAt < cutoff) this.sessions.delete(key);
    }
  }
}
