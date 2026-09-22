import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AfroMessageService {
  private readonly logger = new Logger(AfroMessageService.name);
  private readonly baseUrl = 'https://api.afromessage.com/api';

  constructor(private config: ConfigService) {}

  // ══════════════════════════════════════════════════
  // CORE SEND
  // ══════════════════════════════════════════════════
  private async send(phone: string, message: string): Promise<boolean> {
    const token = this.config.get<string>('AFROMESSAGE_TOKEN');
    const sender = this.config.get<string>('AFROMESSAGE_SENDER') || 'DELIVER';

    // DEV MODE: no token → log to console
    if (!token) {
      this.logger.warn(`[DEV] SMS to ${phone}: ${message}`);
      return true;
    }

    try {
      const res = await axios.get(`${this.baseUrl}/send`, {
        params: { from: sender, sender, to: phone, message },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      if (res.data?.acknowledge === 'success') {
        this.logger.log(`SMS sent to ${phone}`);
        return true;
      }

      this.logger.error(`AfroMessage failed: ${JSON.stringify(res.data)}`);
      return false;
    } catch (err: any) {
      this.logger.error(`AfroMessage error: ${err.message}`);
      return false;
    }
  }

  // ══════════════════════════════════════════════════
  // PUBLIC METHODS
  // ══════════════════════════════════════════════════

  /** OTP for login */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    return this.send(
      phone,
      `Your verification code is ${code}. Valid 5 minutes. Do not share.`,
    );
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
}
