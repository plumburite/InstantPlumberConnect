// SendGrid email service integration
import sgMail from '@sendgrid/mail';

class EmailService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        console.log('SendGrid API key not found - email verification disabled');
        console.log('Set SENDGRID_API_KEY environment variable to enable email verification');
        return;
      }

      if (!apiKey.startsWith('SG.')) {
        console.warn('Warning: SendGrid API key format appears invalid (should start with "SG.")');
      }

      sgMail.setApiKey(apiKey);
      this.initialized = true;
      console.log('✓ SendGrid email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SendGrid:', error);
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  async sendVerificationEmail(email: string, code: string, firstName?: string): Promise<boolean> {
    if (!this.initialized) {
      console.log('Email service not initialized - cannot send verification email');
      return false;
    }

    try {
      const msg = {
        to: email,
        from: 'noreply@instantplumberconnect.com', // Replace with your verified sender
        subject: 'Your Instant Plumber Connect Verification Code',
        text: `Your verification code is: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Instant Plumber Connect</h2>
            <p>Hello ${firstName || 'there'},</p>
            <p>Your verification code is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1f2937; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Instant Plumber Connect - Professional plumbing services made simple
            </p>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Verification email sent successfully to ${email}`);
      return true;
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      
      // Handle specific SendGrid errors
      if (error.response) {
        console.error('SendGrid response error:', {
          status: error.response.status,
          body: error.response.body
        });
      }
      
      return false;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      const msg = {
        to: email,
        from: 'noreply@instantplumberconnect.com',
        subject: 'Welcome to Instant Plumber Connect!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Instant Plumber Connect!</h2>
            <p>Hello ${firstName},</p>
            <p>Your plumber account has been successfully created. You can now:</p>
            <ul>
              <li>Receive instant video call requests from customers</li>
              <li>Manage your availability status</li>
              <li>Track your earnings and call history</li>
            </ul>
            <p>Start receiving calls by setting yourself as available in your dashboard!</p>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();