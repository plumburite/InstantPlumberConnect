import type { Express } from "express";
import { createServer, type Server } from "http";
// Removed Replit Auth import
import { storage } from "./storage";
import { 
  insertCallSchema, insertCustomerSchema, insertServiceSchema, 
  insertInventorySchema, insertInvoiceSchema, insertInvoiceItemSchema, insertFileSchema,
  insertChatSchema, insertMessageSchema, sendMessageSchema, createChatSchema,
  authCodes, userSessions
} from "@shared/schema";
import { SocketServer } from "./socket-server";
import { twilioService } from "./twilio-service";
import { emailService } from "./email-service";
import { db } from "./db";
import { eq, lt } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Clean up expired auth codes and sessions on startup
  async function cleanupExpiredData() {
    try {
      await db.delete(authCodes).where(lt(authCodes.expires, new Date()));
      console.log('Cleaned up expired auth codes');
    } catch (error) {
      console.error('Error cleaning up expired auth codes:', error);
    }
  }

  // Run cleanup on startup
  cleanupExpiredData();

  // Simple session middleware using database
  app.use(async (req: any, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      try {
        // Get session from database
        const [sessionData] = await db
          .select()
          .from(userSessions)
          .where(eq(userSessions.id, sessionId));

        if (sessionData?.userId) {
          // Update last used timestamp
          await db
            .update(userSessions)
            .set({ lastUsed: new Date() })
            .where(eq(userSessions.id, sessionId));

          // Get user data for authenticated requests (check both plumbers and customers)
          const plumber = await storage.getPlumber(sessionData.userId);
          if (plumber) {
            req.user = {
              userId: plumber.id,
              userType: 'plumber',
              ...plumber
            };
          } else {
            // Check if it's a customer
            const customer = await storage.getCustomer(sessionData.userId);
            if (customer) {
              req.user = {
                userId: customer.id,
                userType: 'customer',
                ...customer
              };
            }
          }
        }
      } catch (error) {
        console.error('Session middleware error:', error);
      }
    }
    next();
  });

  // Authentication Routes - Email or SMS
  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber, email, firstName, lastName } = req.body;
      
      if (!phoneNumber && !email) {
        return res.status(400).json({ message: "Phone number or email is required" });
      }

      // Determine primary contact method
      const contactMethod = email ? 'email' : 'phone';
      const identifier = email || phoneNumber;
      
      console.log('Send code request:', { 
        contactMethod, 
        identifier: contactMethod === 'email' ? email : phoneNumber,
        hasName: !!(firstName || lastName) 
      });

      // Generate cryptographically secure 6-digit code
      const crypto = await import('crypto');
      const code = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store auth code in database (upsert - replace if exists)
      // Use email as phone number field if email authentication
      const dbKey = contactMethod === 'email' ? `email:${email}` : phoneNumber;
      
      await db
        .insert(authCodes)
        .values({
          phoneNumber: dbKey,
          code,
          expires,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .onConflictDoUpdate({
          target: authCodes.phoneNumber,
          set: {
            code,
            expires,
            firstName: firstName || null,
            lastName: lastName || null,
            createdAt: new Date(),
          },
        });

      console.log('Auth code stored in database for:', identifier);

      // Format phone number only if using phone authentication
      let formattedPhone = '';
      if (contactMethod === 'phone') {
        formattedPhone = phoneNumber.trim();
        if (!formattedPhone.startsWith('+')) {
          // Clean the number to digits only
          const digitsOnly = formattedPhone.replace(/[^\d]/g, '');
          
          // If it already starts with 1 (US country code), use it as is
          if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
            formattedPhone = '+' + digitsOnly;
          } else {
            // Otherwise assume US number and add +1
            formattedPhone = '+1' + digitsOnly;
          }
        }
      }

      let deliverySuccess = false;

      if (contactMethod === 'email') {
        // Send verification code via email
        if (emailService.isReady()) {
          try {
            deliverySuccess = await emailService.sendVerificationEmail(email!, code, firstName);
            if (deliverySuccess) {
              console.log('Verification email sent successfully to:', email);
              res.json({ message: "Verification code sent to your email" });
              return;
            }
          } catch (emailError: any) {
            console.error('Email send error:', emailError);
          }
        } else {
          console.log('Email service not ready');
        }
      } else {
        // Send verification code via SMS
        if (twilioService.isReady()) {
          try {
            const message = `Your Instant Plumber Connect verification code is: ${code}`;
            deliverySuccess = await twilioService.sendSMS(formattedPhone, message);

            if (deliverySuccess) {
              console.log('SMS sent successfully to:', formattedPhone);
              res.json({ message: "Verification code sent successfully" });
              return;
            }
          } catch (smsError: any) {
            console.error('SMS send error:', smsError);
          }
        } else {
          console.log('Twilio service not ready');
        }
      }

      // Fallback when delivery service unavailable - only succeed in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Delivery fallback - code available in database for testing');
        res.json({ 
          message: contactMethod === 'email' ? "Verification code sent to your email" : "Verification code sent"
        });
      } else {
        console.error('Production delivery failure - no fallback');
        res.status(500).json({
          message: "Failed to send verification code. Please try again later."
        });
      }
    } catch (error: any) {
      console.error('Send code error:', error);
      
      // Generate code for testing even if database fails
      try {
        const { phoneNumber, email, firstName, lastName } = req.body;
        const crypto = await import('crypto');
        const code = crypto.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        
        // Use same logic as main code for determining contact method and db key
        const contactMethod = email ? 'email' : 'phone';
        const dbKey = contactMethod === 'email' ? `email:${email}` : phoneNumber;
        
        if (dbKey) { // Only try database if we have a valid key
          await db
            .insert(authCodes)
            .values({
              phoneNumber: dbKey,
              code,
              expires,
              firstName: firstName || null,
              lastName: lastName || null,
            })
            .onConflictDoUpdate({
              target: authCodes.phoneNumber,
              set: { code, expires, firstName: firstName || null, lastName: lastName || null },
            });
            
          console.log('Database fallback successful for:', dbKey);
        }
      } catch (fallbackError: any) {
        console.error('Database fallback error:', fallbackError);
      }
      
      res.json({ message: "Verification code sent" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { phoneNumber, email, code } = req.body;
      
      console.log('Verify code request:', { 
        phoneNumber, 
        email, 
        code,
        contactMethod: email ? 'email' : 'phone'
      });
      
      if ((!phoneNumber && !email) || !code) {
        return res.status(400).json({ message: "Phone number or email and code are required" });
      }

      // Determine lookup key based on contact method
      const contactMethod = email ? 'email' : 'phone';
      const lookupKey = contactMethod === 'email' ? `email:${email}` : phoneNumber.trim();

      // Get auth data from database
      const [authData] = await db
        .select()
        .from(authCodes)
        .where(eq(authCodes.phoneNumber, lookupKey));
      
      if (!authData) {
        console.log('No auth code found for:', lookupKey);
        return res.status(400).json({ message: "No verification code found" });
      }

      if (new Date() > authData.expires) {
        console.log('Auth code expired for:', lookupKey);
        // Delete expired auth code
        await db.delete(authCodes).where(eq(authCodes.phoneNumber, lookupKey));
        return res.status(400).json({ message: "Verification code expired" });
      }

      if (authData.code !== code) {
        console.log('Invalid code for:', lookupKey, 'expected:', authData.code, 'got:', code);
        return res.status(400).json({ message: "Invalid verification code" });
      }

      console.log('Code verified successfully for:', lookupKey);

      // Code is valid - create/get user and session
      let user;
      if (contactMethod === 'email') {
        user = await storage.getPlumberByEmail(email!);
        if (!user) {
          console.log('Creating new plumber for email:', email);
          // Create new plumber with email auth
          user = await storage.createPlumber({
            firstName: authData.firstName || "Unknown",
            lastName: authData.lastName || "Plumber", 
            email: email!,
            password: "email-auth",
            phoneNumber: null, // No phone for email auth
            company: "",
            licenseNumber: "",
            serviceRadius: 25,
            isAvailable: false,
            totalEarnings: 0,
            rating: "5.0",
            totalJobs: 0,
            latitude: 0,
            longitude: 0
          });
          
          // Send welcome email for email authentication
          if (emailService.isReady()) {
            await emailService.sendWelcomeEmail(email!, authData.firstName || "there");
          }
        }
      } else {
        user = await storage.getPlumberByPhone(phoneNumber);
        if (!user) {
          console.log('Creating new plumber for phone:', phoneNumber);
          // Create new plumber
          user = await storage.createPlumber({
            firstName: authData.firstName || "Unknown",
            lastName: authData.lastName || "Plumber", 
            email: `${phoneNumber}@phone.local`,
            password: "sms-auth",
            phoneNumber: phoneNumber,
            company: "",
            licenseNumber: "",
            serviceRadius: 25,
            isAvailable: false,
            totalEarnings: 0,
            rating: "5.0",
            totalJobs: 0,
            latitude: 0,
            longitude: 0
          });
        }
      }

      // Create session in database
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await db
        .insert(userSessions)
        .values({
          id: sessionId,
          phoneNumber: contactMethod === 'email' ? email! : phoneNumber,
          userId: user.id,
        });

      console.log('Session created:', sessionId, 'for user:', user.id);

      // Clear auth code from database (security: invalidate on successful verification)
      await db.delete(authCodes).where(eq(authCodes.phoneNumber, lookupKey));

      res.json({ 
        sessionId, 
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          company: user.company,
          isAvailable: user.isAvailable
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

  app.post("/api/auth/logout", async (req: any, res) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      try {
        // Delete session from database
        await db.delete(userSessions).where(eq(userSessions.id, sessionId));
      } catch (error) {
        console.error('Error deleting session:', error);
      }
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
  
  // Store socketServer reference for broadcasting from REST endpoints
  let socketServerInstance: SocketServer = socketServer;
  
  // FCM service temporarily disabled for deployment
  // import('./fcm-service').then(({ fcmService }) => {
  // });


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
          password: "auto-generated",
          phoneNumber: "555-0000",
          company: "Self-Employed",
          licenseNumber: "TEMP-" + Date.now(),
          serviceRadius: 25,
          isAvailable: Boolean(isAvailable),
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

  // FCM Token registration endpoint - TEMPORARILY DISABLED
  app.post("/api/plumber/fcm-token", async (req, res) => {
    res.json({ message: "FCM token registration temporarily disabled - feature will be added in future update" });
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
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
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
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const plumber = await storage.getPlumber(userId);
      
      // Format appointment reminder message
      const reminderMessage = `APPOINTMENT REMINDER

Hi ${customer.firstName},

This is a reminder about your upcoming plumbing appointment:

Date: ${appointmentDate}
Time: ${appointmentTime}
${serviceType ? `Service: ${serviceType}` : ''}

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

  // === CHAT MANAGEMENT ===
  
  // Get all chats for authenticated user
  app.get("/api/chats", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const userType = req.user.userType;
      let chats = [];
      
      // Fetch chats based on user type
      if (userType === 'plumber') {
        chats = await storage.getChatsByPlumber(userId);
      } else if (userType === 'customer') {
        chats = await storage.getChatsByCustomer(userId);
      } else {
        return res.status(400).json({ message: "Invalid user type" });
      }
      
      res.json(chats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch chats" });
    }
  });

  // Get a specific chat
  app.get("/api/chats/:id", requireAuth, async (req: any, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Verify user has access to this chat
      const userId = req.user.userId;
      const hasAccess = chat.customerId === userId || chat.plumberId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this chat" });
      }

      res.json(chat);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch chat" });
    }
  });

  // Create a new chat
  app.post("/api/chats", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const validatedData = createChatSchema.parse(req.body);
      
      // Verify user is one of the participants
      if (userId !== validatedData.customerId && userId !== validatedData.plumberId) {
        return res.status(403).json({ message: "Can only create chat between yourself and another user" });
      }

      // Check if active chat already exists between these users
      const existingChat = await storage.getActiveChat(validatedData.customerId, validatedData.plumberId);
      if (existingChat) {
        return res.json(existingChat);
      }

      const chat = await storage.createChat(validatedData);
      res.status(201).json(chat);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create chat" });
    }
  });

  // Update chat status (archive, close, etc.)
  app.patch("/api/chats/:id", requireAuth, async (req: any, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Verify user has access to this chat
      const userId = req.user.userId;
      const hasAccess = chat.customerId === userId || chat.plumberId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this chat" });
      }

      // Only allow safe field updates - prevent changing participant IDs
      const allowedUpdates = {
        status: req.body.status,
      };

      // Remove undefined fields
      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key] === undefined) {
          delete allowedUpdates[key];
        }
      });

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedChat = await storage.updateChat(req.params.id, allowedUpdates);
      res.json(updatedChat);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update chat" });
    }
  });

  // === MESSAGE MANAGEMENT ===

  // Get messages for a chat
  app.get("/api/chats/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Verify user has access to this chat
      const userId = req.user.userId;
      const hasAccess = chat.customerId === userId || chat.plumberId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this chat" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatMessages(req.params.id, limit);
      
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  // Send a message (REST endpoint - real-time via Socket.IO)
  app.post("/api/chats/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Verify user has access to this chat
      const userId = req.user.userId;
      const hasAccess = chat.customerId === userId || chat.plumberId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this chat" });
      }

      // Determine sender type
      const senderType = chat.plumberId === userId ? 'plumber' : 'customer';
      
      const messageData = sendMessageSchema.parse({
        chatId: req.params.id,
        senderId: userId,
        senderType,
        content: req.body.content,
        messageType: req.body.messageType || 'text',
      });

      const message = await storage.createMessage(messageData);

      // Update chat's last message time
      await storage.updateChat(req.params.id, {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      });

      // Broadcast message to Socket.IO users in the chat room
      socketServerInstance.broadcastMessageToChat(
        req.params.id,
        message,
        userId,
        senderType
      );

      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to send message" });
    }
  });

  // Mark messages as read
  app.patch("/api/messages/read", requireAuth, async (req: any, res) => {
    try {
      const { messageIds } = req.body;
      
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: "messageIds array is required" });
      }

      await storage.markMessagesAsRead(messageIds);
      res.json({ message: "Messages marked as read" });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to mark messages as read" });
    }
  });

  return httpServer;
}
