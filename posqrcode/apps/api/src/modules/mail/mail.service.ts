import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: Transporter | null = null

  constructor(private readonly config: ConfigService) {}

  /** True when SMTP host + user + pass are set. */
  isConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST')?.trim()
    const user = this.config.get<string>('SMTP_USER')?.trim()
    const pass = this.config.get<string>('SMTP_PASS')?.trim()
    return Boolean(host && user && pass)
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter
    const host = this.config.get<string>('SMTP_HOST')!.trim()
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587')
    const user = this.config.get<string>('SMTP_USER')!.trim()
    const pass = this.config.get<string>('SMTP_PASS')!.trim().replace(/\s+/g, '')
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
    return this.transporter
  }

  private fromAddress(): string {
    const name = this.config.get<string>('SMTP_FROM_NAME')?.trim() || 'Bear360'
    const user = this.config.get<string>('SMTP_USER')!.trim()
    const fromEmail = this.config.get<string>('SMTP_FROM')?.trim() || user
    return `"${name}" <${fromEmail}>`
  }

  async sendOtpEmail(to: string, code: string, purpose: 'signup' | 'forgot'): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('SMTP is not configured')
    }
    const subject =
      purpose === 'signup'
        ? 'Your Bear360 signup code'
        : 'Your Bear360 password reset code'
    const action = purpose === 'signup' ? 'complete signup' : 'reset your password'
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1F3A">
        <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2F6FED;margin:0 0 8px">Bear360</p>
        <h1 style="font-size:22px;margin:0 0 12px">Your verification code</h1>
        <p style="margin:0 0 20px;line-height:1.5;color:#4A6585">Use this code to ${action}. It expires in 10 minutes.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.35em;margin:0 0 24px">${code}</p>
        <p style="font-size:12px;color:#94A3B8;margin:0">If you did not request this, you can ignore this email.</p>
      </div>
    `
    const info = await this.getTransporter().sendMail({
      from: this.fromAddress(),
      to,
      subject,
      text: `Your Bear360 code is ${code}. It expires in 10 minutes.`,
      html,
    })
    this.logger.log(`OTP mail sent to ${to} messageId=${info.messageId}`)
  }
}
