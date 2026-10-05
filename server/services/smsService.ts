/**
 * Cave Companions - Production SMS OTP Provider Service
 * Abstraction layer for sending OTPs via SMS Providers (Greenweb, BulkSMS BD, Console Dev).
 */

export interface SmsProvider {
  sendOtp(phone: string, code: string, purpose?: string): Promise<{ success: boolean; message?: string }>;
}

export class GreenwebSmsProvider implements SmsProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GREENWEB_API_KEY || process.env.SMS_API_KEY || '';
  }

  async sendOtp(phone: string, code: string, purpose = 'Password Reset'): Promise<{ success: boolean; message?: string }> {
    if (!this.apiKey) {
      console.warn('[SMS PROVIDER] Greenweb API key missing from environment.');
      return { success: false, message: 'SMS Gateway credentials not configured.' };
    }

    try {
      const message = `[Cave Companions] Your ${purpose} OTP code is: ${code}. Valid for 5 minutes. Do not share.`;
      const params = new URLSearchParams({
        token: this.apiKey,
        to: phone,
        message
      });

      const res = await fetch('https://api.greenweb.com.bd/api.php', {
        method: 'POST',
        body: params
      });

      const text = await res.text();
      if (res.ok && text.includes('Ok:')) {
        return { success: true };
      }
      return { success: false, message: `Greenweb SMS Gateway Response: ${text}` };
    } catch (err: any) {
      console.error('[SMS PROVIDER ERROR] Greenweb SMS failed:', err?.message || err);
      return { success: false, message: 'Failed to dispatch SMS via Greenweb.' };
    }
  }
}

export class BulkSmsBdProvider implements SmsProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BULKSMSBD_API_KEY || process.env.SMS_API_KEY || '';
  }

  async sendOtp(phone: string, code: string, purpose = 'Password Reset'): Promise<{ success: boolean; message?: string }> {
    if (!this.apiKey) {
      console.warn('[SMS PROVIDER] BulkSMS BD API key missing from environment.');
      return { success: false, message: 'SMS Gateway credentials not configured.' };
    }

    try {
      const message = `[Cave Companions] Your ${purpose} OTP code is: ${code}. Valid for 5 minutes.`;
      const params = new URLSearchParams({
        api_key: this.apiKey,
        type: 'text',
        number: phone,
        senderid: process.env.SMS_SENDER_ID || '8809612',
        message
      });

      const res = await fetch('http://bulksmsbd.net/api/smsapi', {
        method: 'POST',
        body: params
      });

      const json: any = await res.json();
      if (json && (json.response_code === 202 || json.response_code === '202')) {
        return { success: true };
      }
      return { success: false, message: json?.success_message || 'BulkSMS BD dispatch error' };
    } catch (err: any) {
      console.error('[SMS PROVIDER ERROR] BulkSMS BD failed:', err?.message || err);
      return { success: false, message: 'Failed to dispatch SMS via BulkSMS BD.' };
    }
  }
}

export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string, purpose = 'Password Reset'): Promise<{ success: boolean; message?: string }> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[SMS PROVIDER] Console SMS provider triggered in PRODUCTION. Suppressing plaintext OTP output.');
      return { success: false, message: 'Console provider disabled in production.' };
    }
    console.log(`[DEV SMS OTP] Phone: ${phone} | Purpose: ${purpose} | OTP Code: ${code}`);
    return { success: true };
  }
}

class SmsServiceManager {
  private provider: SmsProvider;

  constructor() {
    const providerName = (process.env.SMS_PROVIDER || '').toLowerCase().trim();
    if (providerName === 'greenweb') {
      this.provider = new GreenwebSmsProvider();
    } else if (providerName === 'bulksmsbd') {
      this.provider = new BulkSmsBdProvider();
    } else {
      // Default fallback
      if (process.env.NODE_ENV === 'production') {
        // Attempt greenweb or bulksmsbd if keys exist
        if (process.env.GREENWEB_API_KEY) {
          this.provider = new GreenwebSmsProvider();
        } else if (process.env.BULKSMSBD_API_KEY) {
          this.provider = new BulkSmsBdProvider();
        } else {
          this.provider = new GreenwebSmsProvider(); // Will return safe unconfigured warning
        }
      } else {
        this.provider = new ConsoleSmsProvider();
      }
    }
  }

  async sendOtp(phone: string, code: string, purpose?: string): Promise<{ success: boolean; message?: string }> {
    return this.provider.sendOtp(phone, code, purpose);
  }
}

export const smsService = new SmsServiceManager();
