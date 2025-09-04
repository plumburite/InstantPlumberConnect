import twilio from 'twilio';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

class TwilioService {
  private client: any;
  private fromNumber: string = '';
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        console.warn('⚠️ Twilio not initialized - missing credentials');
        return;
      }

      this.client = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
      this.isInitialized = true;
      console.log('✅ Twilio SMS service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio:', error);
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('⚠️ Twilio not initialized, cannot send SMS');
      return false;
    }

    try {
      console.log(`📞 Attempting to send SMS from ${this.fromNumber} to ${to}`);
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

      console.log(`📱 SMS sent successfully to ${to} (SID: ${result.sid})`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to send SMS to ${to}:`, error.message);
      console.error(`❌ Error details:`, error);
      
      // If trial account, suggest using verified number
      if (error.message?.includes('trial') || error.message?.includes('Authenticate')) {
        console.error(`💡 Trial account detected. You can only send SMS to verified numbers.`);
        console.error(`💡 To test: Either verify ${to} in Twilio Console, or upgrade to paid account.`);
      }
      
      return false;
    }
  }

  async sendPlumberCallNotification(
    plumberPhone: string, 
    plumberName: string, 
    customerName: string, 
    issue: string
  ): Promise<boolean> {
    const message = `🔧 NEW PLUMBING CALL ALERT!

Customer: ${customerName}
Issue: ${issue}

You have a new video call request. Log into your dashboard to accept the call.

- Instant Plumber Connect`;

    return this.sendSMS(plumberPhone, message);
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const twilioService = new TwilioService();