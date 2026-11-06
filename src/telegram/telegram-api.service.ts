import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  TELEGRAM_API_BASE,
  TELEGRAM_CALL_TIMEOUT_MS,
  TELEGRAM_SAFE_CHUNK_LENGTH,
} from './telegram.constants';

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  contact?: { phone_number: string; first_name: string; user_id?: number };
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramApiError {
  ok: false;
  error_code?: number;
  description?: string;
}

interface TelegramApiResult<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

/**
 * Thin, typed wrapper around the Telegram Bot HTTP API.
 * All failures are logged and swallowed so a Telegram outage can never break
 * the rest of the application (order creation, payment webhooks, ...).
 */
@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly http: AxiosInstance = axios.create({
    baseURL: TELEGRAM_API_BASE,
    timeout: TELEGRAM_CALL_TIMEOUT_MS,
  });

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return !!this.token;
  }

  get botToken(): string | undefined {
    return this.token;
  }

  private get token(): string | undefined {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    return token && token.trim().length > 0 ? token.trim() : undefined;
  }

  async call<T>(method: string, payload: Record<string, unknown> = {}): Promise<T | null> {
    const token = this.token;
    if (!token) {
      this.logger.warn(`TELEGRAM_BOT_TOKEN is not set — skipped ${method}`);
      return null;
    }
    try {
      const res = await this.http.post<TelegramApiResult<T>>(
        `/bot${token}/${method}`,
        payload,
      );
      if (!res.data?.ok) {
        this.logger.error(
          `Telegram ${method} rejected: ${res.data?.description ?? 'unknown error'}`,
        );
        return null;
      }
      return res.data.result ?? null;
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? `${err.response?.status ?? 'network'} ${JSON.stringify(err.response?.data ?? err.message)}`
        : err instanceof Error
          ? err.message
          : String(err);
      this.logger.error(`Telegram ${method} failed: ${message}`);
      return null;
    }
  }

  /** Telegram rejects messages longer than 4096 chars, so long text is chunked. */
  async sendMessage(
    chatId: string | number,
    text: string,
    replyMarkup?: Record<string, unknown>,
  ): Promise<void> {
    const chunks = splitText(text, TELEGRAM_SAFE_CHUNK_LENGTH);
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      await this.call('sendMessage', {
        chat_id: chatId,
        text: chunks[i],
        disable_web_page_preview: true,
        ...(isLast && replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    }
  }

  async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    replyMarkup?: Record<string, unknown>,
  ): Promise<boolean> {
    const result = await this.call<TelegramMessage | boolean>('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
    return result !== null;
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text ? { text, show_alert: false } : {}),
    });
  }

  async sendChatAction(chatId: string | number, action = 'typing'): Promise<void> {
    await this.call('sendChatAction', { chat_id: chatId, action });
  }

  async setMyCommands(commands: ReadonlyArray<{ command: string; description: string }>): Promise<void> {
    await this.call('setMyCommands', { commands });
  }

  async getUpdates(offset: number, timeoutSec: number): Promise<TelegramUpdate[]> {
    const updates = await this.call<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout: timeoutSec,
      allowed_updates: ['message', 'callback_query'],
    });
    return updates ?? [];
  }

  async getMe(): Promise<TelegramUser | null> {
    return this.call<TelegramUser>('getMe');
  }

  async deleteMessage(chatId: string | number, messageId: number): Promise<void> {
    await this.call('deleteMessage', { chat_id: chatId, message_id: messageId });
  }
}

export function splitText(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > size) {
    let cut = remaining.lastIndexOf('\n', size);
    if (cut < size / 2) cut = size;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, '');
  }
  if (remaining.length) chunks.push(remaining);
  return chunks;
}
