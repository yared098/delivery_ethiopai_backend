import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TelegramApiService } from '../../telegram/telegram-api.service';

@Injectable()
export class AfroMessageService {
  private readonly logger = new Logger(AfroMessageService.name);
  private readonly baseUrl = 'https://api.afromessage.com/api';

  // constructor(private config: ConfigService) {}
  constructor(
  private config: ConfigService,
  private telegram: TelegramApiService,
) {}

  // ══════════════════════════════════════════════════
  // CORE SEND
  // ══════════════════════════════════════════════════
  private async send(phone: string, message: string): Promise<boolean> {
    const token = this.config.get<string>('AFROMESSAGE_TOKEN');
    const from = this.config.get<string>('AFROMESSAGE_IDENTIFIER_ID');
    const sender = this.config.get<string>('AFROMESSAGE_SENDER');

    // DEV MODE: no token → log to console
    if (!token) {
      this.logger.warn(`[DEV] SMS to ${phone}: ${message}`);
      return true;
    }

    try {
      // Base params — always included
      const params: Record<string, string> = {
        to: phone,
        message,
      };

      // Only include `from` if configured
      if (from && from.trim()) {
        params.from = from.trim();
      }

      // Only include `sender` if configured
      if (sender && sender.trim()) {
        params.sender = sender.trim();
      }

      this.logger.log(
        `AfroMessage request → to=${phone} from=${params.from || '(default)'} sender=${params.sender || '(default)'}`,
      );

      const res = await axios.get(`${this.baseUrl}/send`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (res.data?.acknowledge === 'success') {
        this.logger.log(`SMS sent to ${phone}`);
        return true;
      }

      // AfroMessage returns errors in response.errors (array)
      const errorMsg =
        res.data?.response?.errors?.[0] ||
        res.data?.response?.message ||
        'Unknown AfroMessage error';

      this.logger.error(`AfroMessage failed: ${errorMsg}`);
      this.logger.error(`Full response: ${JSON.stringify(res.data)}`);
      return false;
    } catch (err: any) {
      this.logger.error(`AfroMessage error: ${err.message}`);
      if (err.response?.data) {
        this.logger.error(`Details: ${JSON.stringify(err.response.data)}`);
      }
      return false;
    }
  }

  // ══════════════════════════════════════════════════
  // PUBLIC METHODS
  // ══════════════════════════════════════════════════

  /** OTP for login */
  // async sendOtp(phone: string, code: string): Promise<boolean> {
  //   return this.send(
  //     phone,
  //     `Your verification code is ${code}. Valid 5 minutes. Do not share.`,
  //   );
  // } 

    /**
   * OTP for login. Sends to Telegram admins AND tries AfroMessage SMS.
   * Succeeds if EITHER channel works.
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    const smsText = `Your verification code is ${code}. Valid 5 minutes. Do not share.`;
    const adminText =
      `🔐 *OTP Request*\n` +
      `📱 Phone: \`${phone}\`\n` +
      `🔑 Code: \`${code}\`\n` +
      `⏱ Valid: 5 minutes\n` +
      `\nReply to the user with this code.`;

    // 1. Send to Telegram admins (best-effort)
    const telegramOk = await this.telegram.sendToAdmins(adminText).catch(() => false);
    if (telegramOk) {
      this.logger.log(`OTP sent to Telegram admin for ${phone}`);
    }

    // 2. Also try SMS (best-effort)
    const smsOk = await this.send(phone, smsText).catch(() => false);
    if (smsOk) {
      this.logger.log(`OTP sent via SMS to ${phone}`);
    }

    // 3. Fallback — console log so admins can still relay it
    if (!telegramOk && !smsOk) {
      this.logger.warn(`[OTP FALLBACK] Phone ${phone} → code ${code}`);
    }

    return telegramOk || smsOk;
  }

  /** Receiver link — used when sender doesn't know address */
  async sendReceiverLink(
    phone: string,
    senderName: string,
    linkUrl: string,
  ): Promise<boolean> {
    return this.send(
      phone,
      `${senderName} is sending you a package. Share your delivery location: ${linkUrl}`,
    );
  }

  /** Public tracking link — sent to sender + receiver */
  async sendTrackingLink(
    phone: string,
    trackingNumber: string,
    trackingUrl: string,
  ): Promise<boolean> {
    return this.send(
      phone,
      `Your package ${trackingNumber} is on the way. Track it live: ${trackingUrl}`,
    );
  }

  /** Courier assigned notification */
  async sendCourierAssigned(
    phone: string,
    trackingNumber: string,
    courierName: string,
    courierPhone: string,
  ): Promise<boolean> {
    return this.send(
      phone,
      `Courier ${courierName} (${courierPhone}) is handling package ${trackingNumber}.`,
    );
  }

  /** Package picked up */
  async sendPickedUp(
    phone: string,
    trackingNumber: string,
  ): Promise<boolean> {
    return this.send(
      phone,
      `Package ${trackingNumber} has been picked up and is on the way.`,
    );
  }

  /** Proximity alert — courier approaching */
  async sendProximityAlert(
    phone: string,
    trackingNumber: string,
    minutesAway: number,
  ): Promise<boolean> {
    return this.send(
      phone,
      `Package ${trackingNumber} is ${minutesAway} minutes away. Be ready!`,
    );
  }

  /** Delivered confirmation */
  async sendDelivered(
    phone: string,
    trackingNumber: string,
  ): Promise<boolean> {
    return this.send(
      phone,
      `Package ${trackingNumber} has been delivered successfully. Thank you!`,
    );
  }

  /** Package arrived at warehouse / branch (sent to receiver or sender) */
  async sendArrivedAtBranch(
    phone: string,
    trackingNumber: string,
    branchName: string,
    isReceiver = true,
  ): Promise<boolean> {
    const text = isReceiver
      ? `Your package ${trackingNumber} has arrived at ${branchName}. It is ready for pickup at our office!`
      : `Your package ${trackingNumber} has arrived at ${branchName}.`;
    return this.send(phone, text);
  }

  /** Package handed over to receiver at warehouse / branch */
  async sendHandedOver(
    phone: string,
    trackingNumber: string,
    branchName: string,
    isReceiver = false,
  ): Promise<boolean> {
    const text = isReceiver
      ? `Package ${trackingNumber} has been collected at ${branchName}. Thank you for using Deliver Ethiopia!`
      : `Your package ${trackingNumber} was successfully collected by the receiver at ${branchName}. Delivery complete!`;
    return this.send(phone, text);
  }

  /** General purpose custom SMS send */
  async sendCustomSms(phone: string, message: string): Promise<boolean> {
    return this.send(phone, message);
  }
}