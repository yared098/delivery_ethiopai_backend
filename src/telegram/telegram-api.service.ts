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

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramLocation {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  contact?: { phone_number: string; first_name: string; user_id?: number };
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  location?: TelegramLocation;
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

  async call<T>(
    method: string,
    payload: Record<string, unknown> | FormData = {},
  ): Promise<T | null> {
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

  /**
   * Send a photo (buffer or URL) to a Telegram chat, with optional caption and buttons.
   */
  async sendPhoto(
    chatId: string | number,
    photo: Buffer | string,
    caption?: string,
    replyMarkup?: Record<string, unknown>,
  ): Promise<TelegramMessage | null> {
    const token = this.token;
    if (!token) {
      this.logger.warn(`TELEGRAM_BOT_TOKEN is not set — skipped sendPhoto`);
      return null;
    }

    try {
      if (typeof photo === 'string' && /^https?:\/\//i.test(photo)) {
        return await this.call<TelegramMessage>('sendPhoto', {
          chat_id: chatId,
          photo,
          ...(caption ? { caption } : {}),
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        });
      }

      let buffer: Buffer;
      if (Buffer.isBuffer(photo)) {
        buffer = photo;
      } else if (typeof photo === 'string' && photo.startsWith('data:')) {
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(photo);
      }

      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('photo', new Blob([buffer as any], { type: 'image/png' }), 'order-qr.png');
      if (caption) {
        const safeCaption =
          caption.length > 1024 ? caption.slice(0, 1020) + '...' : caption;
        form.append('caption', safeCaption);
      }
      if (replyMarkup) {
        form.append('reply_markup', JSON.stringify(replyMarkup));
      }

      const res = await this.http.post<TelegramApiResult<TelegramMessage>>(
        `/bot${token}/sendPhoto`,
        form,
      );

      if (!res.data?.ok) {
        this.logger.error(
          `Telegram sendPhoto rejected: ${res.data?.description ?? 'unknown error'}`,
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
      this.logger.error(`Telegram sendPhoto failed: ${message}`);
      return null;
    }
  }

  /** Telegram rejects messages longer than 4096 chars, so long text is chunked. Returns last message_id. */
  async sendMessage(
    chatId: string | number,
    text: string,
    replyMarkup?: Record<string, unknown>,
  ): Promise<number | null> {
    const chunks = splitText(text, TELEGRAM_SAFE_CHUNK_LENGTH);
    let lastMessageId: number | null = null;
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const result = await this.call<{ message_id: number }>('sendMessage', {
        chat_id: chatId,
        text: chunks[i],
        disable_web_page_preview: true,
        ...(isLast && replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      if (result !== null) lastMessageId = result.message_id;
    }
    return lastMessageId;
  }
    /**
   * Send a message to all configured admin chat IDs.
   * Reads TELEGRAM_ADMIN_CHAT_IDS (comma-separated).
   * Returns true if at least one admin received it.
   */
  async sendToAdmins(text: string): Promise<boolean> {
    const admins = (this.config.get<string>('TELEGRAM_ADMIN_CHAT_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (admins.length === 0) {
      this.logger.warn('No TELEGRAM_ADMIN_CHAT_IDS configured — admin notify skipped');
      return false;
    }

    let sent = 0;
    for (const chatId of admins) {
      // Use `call()` directly so we get a real success/fail signal
      const result = await this.call<{ message_id: number }>('sendMessage', {
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      });
      if (result !== null) sent++;
    }
    return sent > 0;
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

  /**
   * Get file metadata from Telegram Bot API.
   */
  async getFile(
    fileId: string,
  ): Promise<{ file_id: string; file_unique_id: string; file_path?: string; file_size?: number } | null> {
    return this.call('getFile', { file_id: fileId });
  }

  /**
   * Download file content from Telegram by file_path as a Buffer.
   */
  async downloadFile(filePath: string): Promise<Buffer | null> {
    const token = this.token;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured — cannot download file');
      return null;
    }
    try {
      const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TELEGRAM_CALL_TIMEOUT_MS,
      });
      return Buffer.from(res.data);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to download file from Telegram (${filePath}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
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
