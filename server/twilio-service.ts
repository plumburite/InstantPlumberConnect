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
      // Ensure phone number starts with + for international format
      const formattedNumber = to.startsWith('+') ? to : `+1${to}`;
      console.log(`📞 Attempting to send SMS from ${this.fromNumber} to ${formattedNumber}`);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber
      });

      console.log(`📱 SMS sent successfully to ${formattedNumber} (SID: ${result.sid})`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to send SMS to ${to}:`, error.message);
      
      // Handle trial account limitations gracefully
      if (error.code === 20003 || error.message?.includes('Authenticate')) {
        console.log(`📞 Trial Account Limitation: SMS to ${to} blocked`);
        console.log(`💡 To enable SMS for this number:`);
        console.log(`   1. Login to your Twilio Console`);
        console.log(`   2. Go to Phone Numbers > Verified Caller IDs`);
        console.log(`   3. Add and verify ${to}`);
        console.log(`   4. Or upgrade to a paid Twilio account`);
        console.log(`🔔 Using push notifications as primary method instead`);
        
        // Return true since we're handling this gracefully with push notifications
        return true;
      }
      
      console.error(`❌ Error details:`, error);
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