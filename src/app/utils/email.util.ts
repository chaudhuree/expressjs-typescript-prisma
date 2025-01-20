import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config(); // Load environment variables

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface EmailConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure?: boolean;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config?: EmailConfig) {
    // Use provided config or default to Mailtrap
    const emailConfig: EmailConfig = config || {
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.EMAIL_PORT || '2525'),
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.html || options.body
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Method to send OTP for password reset
  async sendPasswordResetOTP(email: string, otp: string): Promise<void> {
    const subject = 'Password Reset OTP';
    const body = `Your password reset OTP is: ${otp}. This OTP will expire in 10 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Your password reset OTP is: <strong>${otp}</strong></p>
      </div>
    `;

    await this.sendEmail({ to: email, subject, body, html });
  }

  // Method to switch email provider configuration
  switchEmailProvider(providerConfig: EmailConfig): void {
    this.transporter = nodemailer.createTransport(providerConfig);
  }
}

// Shitch to gmail provider
export const switchToGmailProvider = () => {
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!gmailClientId || !gmailClientSecret) {
    throw new Error('Gmail credentials are not set in the environment variables');
  }

  emailService.switchEmailProvider({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: gmailClientId,
      pass: gmailClientSecret
    },
    secure: false // Use TLS
  });
};


// Singleton instance for easy import and use
export const emailService = new EmailService();
