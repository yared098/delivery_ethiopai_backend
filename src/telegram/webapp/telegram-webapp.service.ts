import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  telegramId: string;
}

/**
 * Validates Telegram Mini App `initData` and extracts the authenticated user.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
@Injectable()
export class TelegramWebAppService {
  private readonly logger = new Logger(TelegramWebAppService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Validates the initData string sent by the Telegram Mini App.
   * Returns the parsed user, or throws UnauthorizedException.
   */
  validateInitData(initData: string): TelegramWebAppUser {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new UnauthorizedException('Bot token not configured');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new UnauthorizedException('Missing hash in initData');
    }

    // Build the data-check-string: all fields except hash, sorted alphabetically
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Secret key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
    const expectedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) {
      this.logger.warn('Telegram WebApp initData hash mismatch');
      throw new UnauthorizedException('Invalid initData signature');
    }

    // Check expiry (optional — Telegram recommends < 24 h)
    const authDate = Number(params.get('auth_date') ?? 0);
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > 86_400) {
      throw new UnauthorizedException('initData expired (older than 24 h)');
    }

    const userJson = params.get('user');
    if (!userJson) {
      throw new UnauthorizedException('No user in initData');
    }

    let user: Record<string, unknown>;
    try {
      user = JSON.parse(userJson);
    } catch {
      throw new UnauthorizedException('Malformed user in initData');
    }

    return {
      id: user['id'] as number,
      telegramId: String(user['id']),
      first_name: (user['first_name'] as string) ?? '',
      last_name: user['last_name'] as string | undefined,
      username: user['username'] as string | undefined,
      language_code: user['language_code'] as string | undefined,
    };
  }

  /** Convenience: returns true when TELEGRAM_BOT_TOKEN is configured. */
  get isConfigured(): boolean {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    return !!token && token.trim().length > 0;
  }

  /** Public URL base for the web app (falls back to PUBLIC_API_URL). */
  get webAppUrl(): string {
    return (
      this.config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }
}
