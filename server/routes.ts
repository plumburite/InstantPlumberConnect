import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertCallSchema, insertCustomerSchema, insertServiceSchema, 
  insertInventorySchema, insertInvoiceSchema, insertInvoiceItemSchema, insertFileSchema 
} from "@shared/schema";
import { SocketServer } from "./socket-server";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

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
  app.patch("/api/plumber/availability", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { isAvailable } = req.body;
      const updatedPlumber = await storage.updatePlumber(req.user!.id, {
        isAvailable: Boolean(isAvailable),
      });

      if (!updatedPlumber) {
        return res.status(404).json({ message: "Plumber not found" });
      }

      res.json({
        id: updatedPlumber.id,
        isAvailable: updatedPlumber.isAvailable,
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
  app.get("/api/plumber/calls", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const calls = await storage.getCallsByPlumber(req.user!.id);
      res.json(calls);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch calls" });
    }
  });

  // Accept a call (plumber side)
  app.patch("/api/calls/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

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

  // ============ CRM API ENDPOINTS ============

  // Customer Management
  app.get("/api/customers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/low-stock", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch low stock items" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const validatedData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const invoices = await storage.getInvoicesByCustomer(req.params.id);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch customer invoices" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const items = await storage.getInvoiceItems(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch invoice items" });
    }
  });

  app.post("/api/invoices/:id/items", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const files = await storage.getFilesByCustomer(req.params.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch customer files" });
    }
  });

  app.get("/api/files/call/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const files = await storage.getFilesByCall(req.params.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch call files" });
    }
  });

  app.post("/api/files", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
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
