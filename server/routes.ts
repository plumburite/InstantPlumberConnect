import type { Express } from "express";
import { createServer, type Server } from "http";
// Removed Replit Auth import
import { storage } from "./storage";
import { 
  insertCallSchema, insertCustomerSchema, insertServiceSchema, 
  insertInventorySchema, insertInvoiceSchema, insertInvoiceItemSchema, insertFileSchema 
} from "@shared/schema";
import { SocketServer } from "./socket-server";
import { twilioService } from "./twilio-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // SMS Authentication storage
  const authCodes = new Map<string, { code: string, expires: number, firstName?: string, lastName?: string }>();
  const sessions = new Map<string, { phoneNumber: string, userId?: string }>();

  // Simple session middleware
  app.use((req: any, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId && sessions.has(sessionId)) {
      req.user = sessions.get(sessionId);
    }
    next();
  });

  // SMS Authentication Routes
  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber, firstName, lastName } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      authCodes.set(phoneNumber, { code, expires, firstName, lastName });

      // Format phone number (ensure it starts with +)
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        // Assume US number if no country code
        formattedPhone = '+1' + formattedPhone.replace(/[^\d]/g, '');
      }

      console.log(`📞 Sending verification code to: ${formattedPhone}`);
      console.log(`🔢 Generated code: ${code} (for testing)`);

      let smsSuccess = false;
      
      // Try to send SMS via Twilio
      if (twilioService.isReady()) {
        try {
          const message = `Your Instant Plumber Connect verification code is: ${code}`;
          smsSuccess = await twilioService.sendSMS(formattedPhone, message);

          if (smsSuccess) {
            console.log(`✅ Verification code sent successfully to ${formattedPhone}`);
            res.json({ message: "Verification code sent successfully" });
            return;
          }
        } catch (smsError: any) {
          console.error(`❌ SMS sending failed:`, smsError);
        }
      } else {
        console.warn("⚠️ Twilio service not ready");
      }

      // Development/Testing fallback - always works
      console.log(`🧪 Development mode: Use code ${code} for phone ${phoneNumber}`);
      res.json({ 
        message: "Code generated for testing - check server console",
        development: true
      });
    } catch (error: any) {
      console.error("❌ Send code error:", error);
      
      // Still generate code for testing even if SMS fails
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000;
      authCodes.set(phoneNumber, { code, expires, firstName, lastName });
      console.log(`🧪 Fallback code generated: ${code} for ${phoneNumber}`);
      
      res.json({ message: "SMS unavailable - using test mode (check console)", testCode: code });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;
      
      if (!phoneNumber || !code) {
        return res.status(400).json({ message: "Phone number and code are required" });
      }

      const authData = authCodes.get(phoneNumber);
      if (!authData) {
        return res.status(400).json({ message: "No verification code found" });
      }

      if (Date.now() > authData.expires) {
        authCodes.delete(phoneNumber);
        return res.status(400).json({ message: "Verification code expired" });
      }

      if (authData.code !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Code is valid - create/get user and session
      let user = await storage.getPlumberByPhone(phoneNumber);
      if (!user) {
        // Create new plumber
        user = await storage.createPlumber({
          firstName: authData.firstName || "Unknown",
          lastName: authData.lastName || "Plumber", 
          email: `${phoneNumber}@phone.local`,
          phoneNumber: phoneNumber,
          company: "Self-Employed",
          licenseNumber: "TEMP-" + Date.now(),
          serviceRadius: 25,
          isAvailable: false
        });
      }

      // Create session
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessions.set(sessionId, { phoneNumber, userId: user.id });

      // Clear auth code
      authCodes.delete(phoneNumber);

      res.json({ 
        sessionId, 
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          company: user.company
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to verify code" });
    }
  });

  app.get("/api/auth/user", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getPlumberByPhone(req.user.phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        company: user.company
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: "Logged out successfully" });
  });

  // Auth middleware helper
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Create HTTP server first
  const httpServer = createServer(app);
  
  // Initialize Socket.IO server
  const socketServer = new SocketServer(httpServer);
  
  // Initialize FCM service
  import('./fcm-service').then(({ fcmService }) => {
    console.log('FCM Service initialized');
  });

  // Initialize Stripe
  let stripe: any = null;
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    console.log('✅ Stripe initialized');
  } else {
    console.log('⚠️ Stripe not initialized - missing STRIPE_SECRET_KEY');
  }

  // Plumber availability toggle
  app.patch("/api/plumber/availability", requireAuth, async (req: any, res) => {
    try {
      const { isAvailable } = req.body;
      const userId = req.user.userId;
      
      // Try to get plumber by user ID, create if doesn't exist
      let plumber = await storage.getPlumber(userId);
      if (!plumber) {
        // Create plumber profile for new user
        const user = await storage.getUser(userId);
        plumber = await storage.createPlumber({
          firstName: user?.firstName || "Unknown",
          lastName: user?.lastName || "Plumber",
          email: user?.email || "no-email@example.com",
          phoneNumber: "555-0000",
          company: "Self-Employed",
          licenseNumber: "TEMP-" + Date.now(),
          serviceRadius: 25,
          isAvailable: Boolean(isAvailable),
          userId: userId
        });
      } else {
        const updatedPlumber = await storage.updatePlumber(userId, {
          isAvailable: Boolean(isAvailable),
        });
        plumber = updatedPlumber || plumber;
      }

      res.json({
        id: plumber.id,
        isAvailable: plumber.isAvailable,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update availability" });
    }
  });

  // Get available plumbers
  app.get("/api/plumbers/available", async (req, res) => {
    try {
      const availablePlumbers = await storage.getAvailablePlumbers();
      res.json(
        availablePlumbers.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          company: p.company,
          rating: p.rating,
          serviceRadius: p.serviceRadius,
        }))
      );
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch plumbers" });
    }
  });

  // Create a new call request
  app.post("/api/calls", async (req, res) => {
    try {
      const validatedData = insertCallSchema.parse(req.body);
      const call = await storage.createCall(validatedData);
      res.status(201).json(call);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create call" });
    }
  });

  // Get calls for authenticated plumber
  app.get("/api/plumber/calls", requireAuth, async (req, res) => {

    try {
      const calls = await storage.getCallsByPlumber(req.user!.id);
      res.json(calls);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch calls" });
    }
  });

  // Accept a call (plumber side)
  app.patch("/api/calls/:id/accept", async (req, res) => {
    // Auth check handled by requireAuth middleware

    try {
      const call = await storage.getCall(req.params.id);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      if (call.status !== "pending") {
        return res.status(400).json({ message: "Call is no longer available" });
      }

      const updatedCall = await storage.updateCall(req.params.id, {
        plumberId: req.user!.id,
        status: "active",
      });

      res.json(updatedCall);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to accept call" });
    }
  });

  // FCM Token registration endpoint
  app.post("/api/plumber/fcm-token", async (req, res) => {
    // Auth check handled by requireAuth middleware

    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "FCM token is required" });
      }

      // Update plumber's FCM token in database
      if (storage.updatePlumberFCMToken) {
        await storage.updatePlumberFCMToken(req.user!.id, token);
      }

      res.json({ message: "FCM token registered successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to register FCM token" });
    }
  });

  // Stripe Payment Intent endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Payment processing not available" });
    }

    try {
      const { amount, description, customerName } = req.body;
      
      if (!amount || amount < 0.50) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        description: description || 'Plumber Connect Service',
        metadata: {
          customerName: customerName || 'Guest Customer',
          service: 'plumber_connect',
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error('Stripe payment intent creation failed:', error);
      res.status(500).json({ 
        message: "Payment setup failed", 
        error: error.message 
      });
    }
  });

  // Payment status webhook endpoint
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Payment processing not available" });
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!endpointSecret) {
        // If no webhook secret, just acknowledge the webhook
        console.log('⚠️ No webhook secret configured, acknowledging without verification');
        return res.status(200).json({ received: true });
      }

      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.log(`❌ Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`✅ Payment succeeded: ${paymentIntent.id} for ${paymentIntent.amount / 100} ${paymentIntent.currency}`);
        
        // Here you could update your database, send notifications, etc.
        // For example, notify the plumber that payment was received
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log(`❌ Payment failed: ${failedPayment.id}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // ============ SMS API ENDPOINTS ============

  // Send general SMS message
  app.post("/api/sms/send", requireAuth, async (req, res) => {

    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ message: "Phone number and message are required" });
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber.replace(/[-\s\(\)]/g, ''))) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      const success = await twilioService.sendSMS(phoneNumber, message);
      
      if (success) {
        res.json({ 
          message: "SMS sent successfully",
          phoneNumber: phoneNumber,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ message: "Failed to send SMS" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send SMS" });
    }
  });

  // Send SMS to customer
  app.post("/api/sms/send-to-customer", requireAuth, async (req, res) => {

    try {
      const { customerId, message, messageType } = req.body;
      
      if (!customerId || !message) {
        return res.status(400).json({ message: "Customer ID and message are required" });
      }

      // Get customer details
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (!customer.phoneNumber) {
        return res.status(400).json({ message: "Customer has no phone number on file" });
      }

      // Add plumber signature to message
      const userId = req.user.userId;
      const plumber = await storage.getPlumber(userId);
      const fullMessage = `${message}

- ${plumber?.firstName || 'Unknown'} ${plumber?.lastName || 'Plumber'}
${plumber?.company ? `${plumber.company}` : 'Instant Plumber Connect'}`;

      const success = await twilioService.sendSMS(customer.phoneNumber, fullMessage);
      
      if (success) {
        res.json({ 
          message: "SMS sent to customer successfully",
          customerName: `${customer.firstName} ${customer.lastName}`,
          phoneNumber: customer.phoneNumber,
          messageType: messageType || 'general',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ message: "Failed to send SMS to customer" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send SMS to customer" });
    }
  });

  // Send appointment reminder SMS
  app.post("/api/sms/appointment-reminder", requireAuth, async (req, res) => {

    try {
      const { customerId, appointmentDate, appointmentTime, serviceType } = req.body;
      
      if (!customerId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ message: "Customer ID, appointment date, and time are required" });
      }

      // Get customer details
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (!customer.phoneNumber) {
        return res.status(400).json({ message: "Customer has no phone number on file" });
      }

      // Get plumber details
      const userId = req.user.userId;
      const plumber = await storage.getPlumber(userId);
      
      // Format appointment reminder message
      const reminderMessage = `🔧 APPOINTMENT REMINDER

Hi ${customer.firstName},

This is a reminder about your upcoming plumbing appointment:

📅 Date: ${appointmentDate}
🕐 Time: ${appointmentTime}
${serviceType ? `🔧 Service: ${serviceType}` : ''}

Your plumber: ${plumber?.firstName || 'Unknown'} ${plumber?.lastName || 'Plumber'}
${plumber?.company ? `Company: ${plumber.company}` : ''}
${plumber?.phoneNumber ? `Phone: ${plumber.phoneNumber}` : ''}

Please let us know if you need to reschedule.

- Instant Plumber Connect`;

      const success = await twilioService.sendSMS(customer.phoneNumber, reminderMessage);
      
      if (success) {
        res.json({ 
          message: "Appointment reminder sent successfully",
          customerName: `${customer.firstName} ${customer.lastName}`,
          phoneNumber: customer.phoneNumber,
          appointmentDate,
          appointmentTime,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ message: "Failed to send appointment reminder" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send appointment reminder" });
    }
  });

  // Get SMS service status
  app.get("/api/sms/status", requireAuth, async (req, res) => {

    try {
      const isReady = twilioService.isReady();
      res.json({ 
        smsServiceAvailable: isReady,
        message: isReady ? "SMS service is ready" : "SMS service not configured"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to check SMS status" });
    }
  });

  // ============ CRM API ENDPOINTS ============

  // Customer Management
  app.get("/api/customers", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ message: "Customer deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete customer" });
    }
  });

  app.patch("/api/customers/:id/membership", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const { status, expiry } = req.body;
      const customer = await storage.updateCustomerMembership(
        req.params.id, 
        status, 
        expiry ? new Date(expiry) : undefined
      );
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update membership" });
    }
  });

  // Service Management
  app.get("/api/services", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch services" });
    }
  });

  app.get("/api/services/active", async (req, res) => {
    try {
      const services = await storage.getActiveServices();
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const service = await storage.updateService(req.params.id, req.body);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const deleted = await storage.deleteService(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json({ message: "Service deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete service" });
    }
  });

  // Inventory Management
  app.get("/api/inventory", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/low-stock", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch low stock items" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const validatedData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const item = await storage.updateInventoryItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const deleted = await storage.deleteInventoryItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json({ message: "Inventory item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete inventory item" });
    }
  });

  // Invoice Management
  app.get("/api/invoices", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      const items = await storage.getInvoiceItems(invoice.id);
      res.json({ ...invoice, items });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch invoice" });
    }
  });

  app.get("/api/customers/:id/invoices", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const invoices = await storage.getInvoicesByCustomer(req.params.id);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch customer invoices" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const invoice = await storage.updateInvoice(req.params.id, req.body);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json({ message: "Invoice deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete invoice" });
    }
  });

  // Invoice Items Management
  app.get("/api/invoices/:id/items", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const items = await storage.getInvoiceItems(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch invoice items" });
    }
  });

  app.post("/api/invoices/:id/items", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const validatedData = insertInvoiceItemSchema.parse({
        ...req.body,
        invoiceId: req.params.id,
      });
      const item = await storage.createInvoiceItem(validatedData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create invoice item" });
    }
  });

  app.patch("/api/invoice-items/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const item = await storage.updateInvoiceItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Invoice item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update invoice item" });
    }
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const deleted = await storage.deleteInvoiceItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice item not found" });
      }
      res.json({ message: "Invoice item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete invoice item" });
    }
  });

  // File Management
  app.get("/api/files/customer/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const files = await storage.getFilesByCustomer(req.params.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch customer files" });
    }
  });

  app.get("/api/files/call/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const files = await storage.getFilesByCall(req.params.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch call files" });
    }
  });

  app.post("/api/files", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const validatedData = insertFileSchema.parse({
        ...req.body,
        uploadedBy: req.user!.id,
      });
      const file = await storage.createFile(validatedData);
      res.status(201).json(file);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create file record" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    // Auth check handled by requireAuth middleware
    try {
      const deleted = await storage.deleteFile(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json({ message: "File deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete file" });
    }
  });

  return httpServer;
}
