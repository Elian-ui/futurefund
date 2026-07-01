import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PesajetPaymentRequest {
  type: 'COLLECTION' | 'DISBURSEMENT';
  amount: number;
  currency: 'UGX';
  phoneNumber: string;
  provider: string;
  reference?: string;
  description?: string;
}

export type PesajetPaymentResponse = Record<string, unknown>;

@Injectable()
export class PesajetService {
  constructor(private readonly configService: ConfigService) {}

  async createPayment(input: PesajetPaymentRequest): Promise<PesajetPaymentResponse> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getPayment(transactionId: string): Promise<PesajetPaymentResponse> {
    return this.request(`/payments/${encodeURIComponent(transactionId)}`, { method: 'GET' });
  }

  private async request(path: string, init: RequestInit): Promise<PesajetPaymentResponse> {
    const apiKey = this.configService.get<string>('PESAJET_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('PesaJet API key is not configured');
    }

    const baseUrl =
      this.configService.get<string>('PESAJET_API_BASE_URL') ??
      'https://payments.pesajet.com/api/v1';

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new BadRequestException('Could not connect to PesaJet payments');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof data === 'object' && data && 'message' in data
          ? String(data.message)
          : 'PesaJet payment request failed';
      throw new BadRequestException(message);
    }

    return data;
  }
}
