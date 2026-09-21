import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AfroMessageService {
  private readonly logger = new Logger(AfroMessageService.name);
  private readonly baseUrl = 'https://api.afromessage.com/api';

  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<boolean> {
    const token = this.config.get<string>('AFROMESSAGE_TOKEN');
    const sender = this.config.get<string>('AFROMESSAGE_SENDER') || 'DELIVER';

    if (!token) {
      this.logger.warn(`[DEV] OTP for ${phone}: ${code}`);
      return true;
    }

    try {
      const res = await axios.get(`${this.baseUrl}/send`, {
        params: {
          from: sender,
          sender,
          to: phone,
          message: `Your verification code is ${code}. Valid 5 minutes. Do not share.`,
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      if (res.data?.acknowledge === 'success') {
        this.logger.log(`OTP sent to ${phone}`);
        return true;
      }

      this.logger.error(`AfroMessage failed: ${JSON.stringify(res.data)}`);
      return false;
    } catch (err: any) {
      this.logger.error(`AfroMessage error: ${err.message}`);
      return false;
    }
  }
}
