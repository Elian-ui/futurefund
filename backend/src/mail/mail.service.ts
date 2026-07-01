import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type MailIntent =
  | 'email-verification'
  | 'password-reset'
  | 'wallet-review'
  | 'support-reply';

interface MailPayload {
  to: string;
  subject: string;
  preview: string;
  html: string;
  text: string;
  intent: MailIntent;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend?: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const url = this.buildUrl('/auth/verify-email', { token });
    await this.send({
      to,
      intent: 'email-verification',
      subject: 'Verify your FutureFund account',
      preview: 'Confirm your email address to secure your FutureFund account.',
      html: this.template({
        title: 'Verify your email',
        body: `Hi ${this.escape(name)}, confirm this email address to finish securing your FutureFund account.`,
        ctaLabel: 'Verify Email',
        ctaUrl: url,
      }),
      text: `Verify your FutureFund account: ${url}`,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const url = this.buildUrl('/auth/reset-password', { token });
    await this.send({
      to,
      intent: 'password-reset',
      subject: 'Reset your FutureFund password',
      preview: 'Use this secure link to reset your FutureFund password.',
      html: this.template({
        title: 'Reset your password',
        body: `Hi ${this.escape(name)}, use the link below to set a new password. The link expires soon.`,
        ctaLabel: 'Reset Password',
        ctaUrl: url,
      }),
      text: `Reset your FutureFund password: ${url}`,
    });
  }

  async sendWalletReviewEmail(
    to: string,
    name: string,
    title: string,
    message: string,
  ) {
    await this.send({
      to,
      intent: 'wallet-review',
      subject: title,
      preview: message,
      html: this.template({
        title,
        body: `Hi ${this.escape(name)}, ${this.escape(message)}`,
        ctaLabel: 'Open Dashboard',
        ctaUrl: this.buildUrl('/dashboard'),
      }),
      text: `${title}\n\n${message}`,
    });
  }

  async sendSupportReplyEmail(to: string, name: string, subject: string) {
    await this.send({
      to,
      intent: 'support-reply',
      subject: 'Support replied to your ticket',
      preview: `A staff member replied to: ${subject}`,
      html: this.template({
        title: 'Support replied',
        body: `Hi ${this.escape(name)}, a staff member replied to your ticket: ${this.escape(subject)}.`,
        ctaLabel: 'Open Support',
        ctaUrl: this.buildUrl('/support'),
      }),
      text: `A staff member replied to your FutureFund support ticket: ${subject}`,
    });
  }

  private async send(payload: MailPayload) {
    if (!this.isMailEnabled()) {
      this.logger.log(
        `Email disabled by MAIL_ENABLED for ${payload.to}. Skipped ${payload.intent}.`,
      );
      return;
    }

    const from = this.configService.get<string>('MAIL_FROM');
    if (!this.resend || !from) {
      this.logger.warn(
        `Email skipped for ${payload.to}. Configure RESEND_API_KEY and MAIL_FROM to send ${payload.intent}.`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send ${payload.intent} email to ${payload.to}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private isMailEnabled() {
    const value = this.configService.get<string>('MAIL_ENABLED');
    return !['false', '0', 'off', 'no'].includes(
      value?.trim().toLowerCase() ?? '',
    );
  }

  private buildUrl(path: string, params?: Record<string, string>) {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      this.configService.get<string>('FRONTEND_ORIGIN') ??
      'http://localhost:3000';
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private template({
    title,
    body,
    ctaLabel,
    ctaUrl,
  }: {
    title: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
  }) {
    return `
      <div style="font-family:Inter,Arial,sans-serif;background:#06110d;padding:32px;color:#f7fffb">
        <div style="max-width:560px;margin:0 auto;background:#0a1712;border:1px solid #123526;border-radius:16px;padding:28px">
          <div style="font-size:22px;font-weight:800;margin-bottom:18px">Future<span style="color:#16c784">Fund</span></div>
          <h1 style="font-size:24px;line-height:1.25;margin:0 0 12px">${this.escape(title)}</h1>
          <p style="font-size:15px;line-height:1.7;color:#b9c7c0;margin:0 0 24px">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;background:#16c784;color:#04100b;text-decoration:none;font-weight:800;border-radius:12px;padding:12px 18px">${this.escape(ctaLabel)}</a>
          <p style="font-size:12px;line-height:1.6;color:#71817a;margin:24px 0 0">If the button does not work, copy and paste this link into your browser:<br>${ctaUrl}</p>
        </div>
      </div>
    `;
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
