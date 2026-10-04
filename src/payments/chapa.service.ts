import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ChapaInitParams {
  amount: number;
  currency?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  txRef: string;
  callbackUrl: string;
  returnUrl: string;
  title?: string;
  description?: string;
  provider: {
    apiSecret: string | null;
    isTestMode: boolean;
    configJson?: any;
  };
}

@Injectable()
export class ChapaService {
  private readonly logger = new Logger(ChapaService.name);
  private readonly baseUrl = 'https://api.chapa.co/v1';

  constructor(private prisma: PrismaService) {}

  /**
   * Load Chapa provider from DB (with secrets)
   */
  async getChapaProvider() {
    const provider = await this.prisma.paymentProvider.findUnique({
      where: { code: 'CHAPA' },
    });

    console.log('🔍 [getChapaProvider]:', {
      found: !!provider,
      code: provider?.code,
      isEnabled: provider?.isEnabled,
      keyLen: provider?.apiSecret?.length || 0,
      keyPrefix: provider?.apiSecret?.slice(0, 14) || '(null)',
    });

    if (!provider) throw new NotFoundException('Chapa provider not configured');
    if (!provider.isEnabled)
      throw new BadRequestException('Chapa payment is currently disabled');
    if (!provider.apiSecret)
      throw new BadRequestException('Chapa secret key not configured');

    return provider;
  }

  /**
   * Initialize payment on Chapa
   */
  async initialize(params: ChapaInitParams) {
    const body = {
      amount: params.amount.toFixed(2),
      currency: params.currency || 'ETB',
      email: "yades.dev@gmail.com",
      first_name: params.firstName,
      last_name: params.lastName,
      phone_number: params.phone,
      tx_ref: params.txRef,
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      customization: {
        title: params.title || 'Deliver Ethiopia',
        description: params.description || `Payment ${params.txRef}`,
      },
    };

    // ══════════════════════════════════════════
    // DEBUG — shows what we send to Chapa
    // ══════════════════════════════════════════
    const key = params.provider?.apiSecret || '';
    console.log('🔍 [initialize] Sending to Chapa:', {
      keyLength: key.length,
      keyPrefix: key.slice(0, 14),
      authHeader: `Bearer ${key.slice(0, 20)}...`,
      url: `${this.baseUrl}/transaction/initialize`,
    });

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await res.json();

    console.log('📥 [initialize] HTTP:', res.status);
    console.log('📥 [initialize] Response:', JSON.stringify(data, null, 2));

    if (!res.ok || data.status !== 'success') {
      this.logger.error('Chapa init failed', data);
      throw new BadRequestException(
        data?.message || 'Failed to initialize Chapa payment',
      );
    }

    return {
      checkoutUrl: data.data.checkout_url as string,
      raw: data,
    };
  }

  /**
   * Verify a Chapa transaction by tx_ref
   */
  async verify(txRef: string) {
    const provider = await this.getChapaProvider();

    const res = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(txRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${provider.apiSecret}`,
        },
      },
    );

    const data: any = await res.json();

    const success =
      res.ok && data.status === 'success' && data.data?.status === 'success';

    return {
      verified: success,
      amount: data?.data?.amount ? Number(data.data.amount) : null,
      currency: data?.data?.currency,
      paymentMethod: data?.data?.payment_method,
      chapaRef: data?.data?.reference,
      raw: data,
    };
  }
}