import nodemailer from "nodemailer";

type SendResult = { success: boolean; info?: any };

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE || SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function verificationEmailHtml(code: string, firstName?: string) {
  const name = firstName ? `Hi ${firstName},` : "Hello,";
  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <p>${name}</p>
      <p>Your verification code for Instant Plumber Connect is:</p>
      <h2 style="letter-spacing: 4px;">${code}</h2>
      <p>This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
      <hr />
      <p style="font-size: 12px; color: #666;">If you have trouble signing in, contact support.</p>
    </div>
  `;
}

function welcomeEmailHtml(firstName?: string) {
  const name = firstName ? `Hi ${firstName},` : "Welcome,";
  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <p>${name}</p>
      <p>Welcome to Instant Plumber Connect — glad to have you on board.</p>
      <p>Start by updating your profile and verifying your contact details.</p>
      <hr />
      <p style="font-size: 12px; color: #666;">Thank you,<br/>The Instant Plumber Connect Team</p>
    </div>
  `;
}

export const emailService = {
  isReady() {
    return transporter !== null || process.env.NODE_ENV === "development";
  },

  async sendVerificationEmail(to: string, code: string, firstName?: string): Promise<boolean> {
    try {
      const subject = "Your Instant Plumber Connect verification code";
      const html = verificationEmailHtml(code, firstName);
      if (transporter) {
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || `"Instant Plumber Connect" <no-reply@plumberconnect.local>`,
          to,
          subject,
          html,
          text: `Your verification code is ${code}`,
        });
        console.log("Verification email sent:", info.messageId);
        return true;
      } else {
        // Development fallback: log code so you can test without SMTP configured
        console.log(`[DEV EMAIL] To: ${to} Subject: ${subject} Code: ${code}`);
        return true;
      }
    } catch (err) {
      console.error("Error sending verification email:", err);
      return false;
    }
  },

  async sendWelcomeEmail(to: string, firstName?: string): Promise<boolean> {
    try {
      const subject = "Welcome to Instant Plumber Connect";
      const html = welcomeEmailHtml(firstName);
      if (transporter) {
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || `"Instant Plumber Connect" <no-reply@plumberconnect.local>`,
          to,
          subject,
          html,
          text: `Welcome to Instant Plumber Connect.`,
        });
        console.log("Welcome email sent:", info.messageId);
        return true;
      } else {
        console.log(`[DEV EMAIL] To: ${to} Subject: ${subject}`);
        return true;
      }
    } catch (err) {
      console.error("Error sending welcome email:", err);
      return false;
    }
  },

  async sendGenericEmail(to: string, subject: string, html: string): Promise<SendResult> {
    try {
      if (transporter) {
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || `"Instant Plumber Connect" <no-reply@plumberconnect.local>`,
          to,
          subject,
          html,
        });
        return { success: true, info };
      } else {
        console.log(`[DEV EMAIL] To: ${to} Subject: ${subject} HTML: ${html}`);
        return { success: true, info: "dev-fallback" };
      }
    } catch (err) {
      console.error("Error sending email:", err);
      return { success: false, info: err };
    }
  },
};

export default emailService;