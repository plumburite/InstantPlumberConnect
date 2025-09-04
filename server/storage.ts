import { 
  type Plumber, type InsertPlumber, type Call, type InsertCall, type User, type UpsertUser,
  type Customer, type InsertCustomer, type Service, type InsertService,
  type Inventory, type InsertInventory, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem, type File, type InsertFile,
  plumbers, calls, customers, services, inventory, invoices, invoiceItems, files, users
} from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
// import { MongoDBStorage } from './mongodb-storage';
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Plumber management
  getPlumber(id: string): Promise<Plumber | undefined>;
  getPlumberByEmail(email: string): Promise<Plumber | undefined>;
  createPlumber(plumber: InsertPlumber): Promise<Plumber>;
  updatePlumber(id: string, updates: Partial<Plumber>): Promise<Plumber | undefined>;
  getAvailablePlumbers(): Promise<Plumber[]>;
  
  // Call management
  getCall(id: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  getCallsByPlumber(plumberId: string): Promise<Call[]>;
  updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined>;
  
  // Customer management
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phoneNumber: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  deleteCustomer(id: string): Promise<boolean>;
  updateCustomerMembership(id: string, status: string, expiry?: Date): Promise<Customer | undefined>;
  
  // Service management
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<Service>): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  getActiveServices(): Promise<Service[]>;
  deleteService(id: string): Promise<boolean>;
  
  // Inventory management
  getInventoryItem(id: string): Promise<Inventory | undefined>;
  getInventoryBySku(sku: string): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: string, updates: Partial<Inventory>): Promise<Inventory | undefined>;
  getAllInventory(): Promise<Inventory[]>;
  getLowStockItems(): Promise<Inventory[]>;
  deleteInventoryItem(id: string): Promise<boolean>;
  
  // Invoice management
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  getInvoicesByCustomer(customerId: string): Promise<Invoice[]>;
  getInvoicesByPlumber(plumberId: string): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  deleteInvoice(id: string): Promise<boolean>;
  
  // Invoice item management
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;
  
  // File management
  getFile(id: string): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  getFilesByCustomer(customerId: string): Promise<File[]>;
  getFilesByCall(callId: string): Promise<File[]>;
  getFilesByInvoice(invoiceId: string): Promise<File[]>;
  deleteFile(id: string): Promise<boolean>;
  
  // Enhanced methods for geolocation and advanced features
  getNearbyPlumbers?(lat: number, lng: number, maxDistance?: number): Promise<Plumber[]>;
  updatePlumberLocation?(id: string, lat: number, lng: number): Promise<void>;
  updatePlumberFCMToken?(id: string, fcmToken: string): Promise<void>;
  createCallWithLocation?(call: InsertCall, lat: number, lng: number): Promise<Call>;
  getPendingCalls?(): Promise<Call[]>;
  searchPlumbers?(filters: any): Promise<Plumber[]>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private plumbers: Map<string, Plumber>;
  private calls: Map<string, Call>;
  private customers: Map<string, Customer>;
  private services: Map<string, Service>;
  private inventory: Map<string, Inventory>;
  private invoices: Map<string, Invoice>;
  private invoiceItems: Map<string, InvoiceItem>;
  private files: Map<string, File>;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.plumbers = new Map();
    this.calls = new Map();
    this.customers = new Map();
    this.services = new Map();
    this.inventory = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.files = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with some mock data for testing
    this.seedData();
  }

  private async seedData() {
    // Seed plumbers
    const mockPlumbers: InsertPlumber[] = [
      {
        email: "mike@petersonplumbing.com",
        password: "$2a$10$hash", // Will be properly hashed in auth
        firstName: "Mike",
        lastName: "Peterson",
        company: "Peterson Plumbing LLC",
        licenseNumber: "PLB-2024-001",
        phoneNumber: "(555) 123-4567",
        serviceRadius: 25,
      },
      {
        email: "sarah@quickfix.com", 
        password: "$2a$10$hash",
        firstName: "Sarah",
        lastName: "Johnson",
        company: "QuickFix Plumbing",
        licenseNumber: "PLB-2024-002",
        phoneNumber: "(555) 987-6543",
        serviceRadius: 15,
      },
    ];

    for (const plumber of mockPlumbers) {
      const created = await this.createPlumber(plumber);
      await this.updatePlumber(created.id, { isAvailable: true });
    }

    // Seed services
    const mockServices: InsertService[] = [
      { name: "Drain Cleaning", description: "Professional drain cleaning service", basePrice: "89.99", category: "maintenance" },
      { name: "Pipe Repair", description: "Emergency pipe repair and replacement", basePrice: "150.00", category: "repair" },
      { name: "Toilet Installation", description: "Complete toilet installation service", basePrice: "200.00", category: "installation" },
      { name: "Emergency Call", description: "24/7 emergency plumbing service", basePrice: "250.00", category: "emergency" },
    ];

    for (const service of mockServices) {
      await this.createService(service);
    }

    // Seed inventory
    const mockInventory: InsertInventory[] = [
      { name: "PVC Pipe 3/4\"", description: "Standard PVC pipe", sku: "PVC-001", category: "pipes", unitPrice: "2.50" },
      { name: "Toilet Flapper", description: "Universal toilet flapper", sku: "FLP-001", category: "fixtures", unitPrice: "12.99" },
      { name: "Pipe Wrench", description: "Professional pipe wrench", sku: "TL-001", category: "tools", unitPrice: "45.00" },
    ];

    for (const item of mockInventory) {
      await this.createInventoryItem(item);
    }
  }

  async getPlumber(id: string): Promise<Plumber | undefined> {
    return this.plumbers.get(id);
  }

  async getPlumberByEmail(email: string): Promise<Plumber | undefined> {
    return Array.from(this.plumbers.values()).find(
      (plumber) => plumber.email === email,
    );
  }

  async createPlumber(insertPlumber: InsertPlumber): Promise<Plumber> {
    const id = randomUUID();
    const plumber: Plumber = { 
      ...insertPlumber,
      serviceRadius: insertPlumber.serviceRadius || 25,
      id,
      isAvailable: false,
      rating: "4.9",
      totalReviews: 0,
      createdAt: new Date(),
    };
    this.plumbers.set(id, plumber);
    return plumber;
  }

  async updatePlumber(id: string, updates: Partial<Plumber>): Promise<Plumber | undefined> {
    const plumber = this.plumbers.get(id);
    if (!plumber) return undefined;
    
    const updated = { ...plumber, ...updates };
    this.plumbers.set(id, updated);
    return updated;
  }

  async getAvailablePlumbers(): Promise<Plumber[]> {
    return Array.from(this.plumbers.values()).filter(p => p.isAvailable);
  }

  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = randomUUID();
    const call: Call = { 
      id,
      plumberId: null,
      customerId: insertCall.customerId || null,
      customerName: insertCall.customerName || null,
      customerPhone: insertCall.customerPhone,
      customerLocation: insertCall.customerLocation || null,
      issueDescription: insertCall.issueDescription || null,
      status: "pending",
      startTime: new Date(),
      endTime: null,
      rating: null,
      earnings: null,
    };
    this.calls.set(id, call);
    return call;
  }

  async getCallsByPlumber(plumberId: string): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(c => c.plumberId === plumberId);
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    const call = this.calls.get(id);
    if (!call) return undefined;
    
    const updated = { ...call, ...updates };
    this.calls.set(id, updated);
    return updated;
  }

  // Legacy user methods for auth compatibility
  async getUser(id: string): Promise<User | undefined> {
    return this.getPlumber(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.getPlumberByEmail(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.createPlumber(user);
  }

  // Customer management
  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByPhone(phoneNumber: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(c => c.phoneNumber === phoneNumber);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      id,
      firstName: insertCustomer.firstName,
      lastName: insertCustomer.lastName,
      email: insertCustomer.email || null,
      phoneNumber: insertCustomer.phoneNumber,
      address: insertCustomer.address || null,
      city: insertCustomer.city || null,
      state: insertCustomer.state || null,
      zipCode: insertCustomer.zipCode || null,
      membershipStatus: insertCustomer.membershipStatus || "none",
      membershipExpiry: insertCustomer.membershipExpiry || null,
      notes: insertCustomer.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updated = { ...customer, ...updates, updatedAt: new Date() };
    this.customers.set(id, updated);
    return updated;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  async updateCustomerMembership(id: string, status: string, expiry?: Date): Promise<Customer | undefined> {
    return this.updateCustomer(id, { membershipStatus: status, membershipExpiry: expiry });
  }

  // Service management
  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = randomUUID();
    const service: Service = {
      id,
      name: insertService.name,
      description: insertService.description || null,
      basePrice: insertService.basePrice,
      category: insertService.category,
      estimatedDuration: insertService.estimatedDuration || null,
      isActive: insertService.isActive !== undefined ? insertService.isActive : true,
      createdAt: new Date(),
    };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updated = { ...service, ...updates };
    this.services.set(id, updated);
    return updated;
  }

  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getActiveServices(): Promise<Service[]> {
    return Array.from(this.services.values()).filter(s => s.isActive);
  }

  async deleteService(id: string): Promise<boolean> {
    return this.services.delete(id);
  }

  // Inventory management
  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    return this.inventory.get(id);
  }

  async getInventoryBySku(sku: string): Promise<Inventory | undefined> {
    return Array.from(this.inventory.values()).find(i => i.sku === sku);
  }

  async createInventoryItem(insertInventory: InsertInventory): Promise<Inventory> {
    const id = randomUUID();
    const item: Inventory = {
      id,
      name: insertInventory.name,
      description: insertInventory.description || null,
      sku: insertInventory.sku || null,
      category: insertInventory.category,
      unitPrice: insertInventory.unitPrice,
      quantityInStock: insertInventory.quantityInStock || 0,
      minimumStock: insertInventory.minimumStock || 0,
      supplier: insertInventory.supplier || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.inventory.set(id, item);
    return item;
  }

  async updateInventoryItem(id: string, updates: Partial<Inventory>): Promise<Inventory | undefined> {
    const item = this.inventory.get(id);
    if (!item) return undefined;
    
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.inventory.set(id, updated);
    return updated;
  }

  async getAllInventory(): Promise<Inventory[]> {
    return Array.from(this.inventory.values());
  }

  async getLowStockItems(): Promise<Inventory[]> {
    return Array.from(this.inventory.values()).filter(i => 
      i.quantityInStock !== null && i.minimumStock !== null && 
      i.quantityInStock <= i.minimumStock
    );
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    return this.inventory.delete(id);
  }

  // Invoice management
  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    return Array.from(this.invoices.values()).find(i => i.invoiceNumber === invoiceNumber);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice: Invoice = {
      id,
      callId: insertInvoice.callId || null,
      customerId: insertInvoice.customerId || null,
      plumberId: insertInvoice.plumberId || null,
      invoiceNumber,
      status: insertInvoice.status || "draft",
      subtotal: insertInvoice.subtotal,
      taxAmount: insertInvoice.taxAmount || "0",
      totalAmount: insertInvoice.totalAmount,
      dueDate: insertInvoice.dueDate || null,
      paidAt: insertInvoice.paidAt || null,
      notes: insertInvoice.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updated = { ...invoice, ...updates, updatedAt: new Date() };
    this.invoices.set(id, updated);
    return updated;
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(i => i.customerId === customerId);
  }

  async getInvoicesByPlumber(plumberId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(i => i.plumberId === plumberId);
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return this.invoices.delete(id);
  }

  // Invoice item management
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(i => i.invoiceId === invoiceId);
  }

  async createInvoiceItem(insertItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = randomUUID();
    const item: InvoiceItem = {
      id,
      invoiceId: insertItem.invoiceId || null,
      serviceId: insertItem.serviceId || null,
      inventoryId: insertItem.inventoryId || null,
      description: insertItem.description,
      quantity: insertItem.quantity || 1,
      unitPrice: insertItem.unitPrice,
      totalPrice: insertItem.totalPrice,
    };
    this.invoiceItems.set(id, item);
    return item;
  }

  async updateInvoiceItem(id: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const item = this.invoiceItems.get(id);
    if (!item) return undefined;
    
    const updated = { ...item, ...updates };
    this.invoiceItems.set(id, updated);
    return updated;
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    return this.invoiceItems.delete(id);
  }

  // File management
  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = {
      id,
      customerId: insertFile.customerId || null,
      callId: insertFile.callId || null,
      invoiceId: insertFile.invoiceId || null,
      fileName: insertFile.fileName,
      originalName: insertFile.originalName,
      fileType: insertFile.fileType,
      fileSize: insertFile.fileSize,
      filePath: insertFile.filePath,
      category: insertFile.category || "general",
      uploadedBy: insertFile.uploadedBy || null,
      createdAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async getFilesByCustomer(customerId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(f => f.customerId === customerId);
  }

  async getFilesByCall(callId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(f => f.callId === callId);
  }

  async getFilesByInvoice(invoiceId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(f => f.invoiceId === invoiceId);
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  // Enhanced methods - dummy implementations for memory storage
  async getNearbyPlumbers(lat: number, lng: number, maxDistance?: number): Promise<Plumber[]> {
    return this.getAvailablePlumbers();
  }

  async updatePlumberLocation(id: string, lat: number, lng: number): Promise<void> {
    // No-op for memory storage
  }

  async updatePlumberFCMToken(id: string, fcmToken: string): Promise<void> {
    // No-op for memory storage
  }

  async createCallWithLocation(call: InsertCall, lat: number, lng: number): Promise<Call> {
    return this.createCall(call);
  }

  async getPendingCalls(): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(c => c.status === 'pending');
  }

  async searchPlumbers(filters: any): Promise<Plumber[]> {
    return this.getAvailablePlumbers();
  }
}

export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  public sessionStore: session.Store;

  constructor() {
    const PgSession = connectPgSimple(session);
    this.sessionStore = new PgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'session',
      createTableIfMissing: true,
    });
  }

  async getPlumber(id: string): Promise<Plumber | undefined> {
    const [plumber] = await db.select().from(plumbers).where(eq(plumbers.id, id));
    return plumber || undefined;
  }

  async getPlumberByEmail(email: string): Promise<Plumber | undefined> {
    const [plumber] = await db.select().from(plumbers).where(eq(plumbers.email, email));
    return plumber || undefined;
  }

  async createPlumber(insertPlumber: InsertPlumber): Promise<Plumber> {
    const [plumber] = await db
      .insert(plumbers)
      .values({
        ...insertPlumber,
        serviceRadius: insertPlumber.serviceRadius || 25,
      })
      .returning();
    return plumber;
  }

  async updatePlumber(id: string, updates: Partial<Plumber>): Promise<Plumber | undefined> {
    const [plumber] = await db
      .update(plumbers)
      .set(updates)
      .where(eq(plumbers.id, id))
      .returning();
    return plumber || undefined;
  }

  async getAvailablePlumbers(): Promise<Plumber[]> {
    return await db.select().from(plumbers).where(eq(plumbers.isAvailable, true));
  }

  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call || undefined;
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values(insertCall)
      .returning();
    return call;
  }

  async getCallsByPlumber(plumberId: string): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.plumberId, plumberId));
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    const [call] = await db
      .update(calls)
      .set(updates)
      .where(eq(calls.id, id))
      .returning();
    return call || undefined;
  }

  // Legacy user methods for auth compatibility
  async getUser(id: string): Promise<User | undefined> {
    return this.getPlumber(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.getPlumberByEmail(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.createPlumber(user);
  }

  // Customer management
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByPhone(phoneNumber: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phoneNumber, phoneNumber));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values({
        ...insertCustomer,
        updatedAt: new Date(),
      })
      .returning();
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateCustomerMembership(id: string, status: string, expiry?: Date): Promise<Customer | undefined> {
    return this.updateCustomer(id, { membershipStatus: status, membershipExpiry: expiry });
  }

  // Service management
  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set(updates)
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getActiveServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async deleteService(id: string): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Inventory management
  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item || undefined;
  }

  async getInventoryBySku(sku: string): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.sku, sku));
    return item || undefined;
  }

  async createInventoryItem(insertInventory: InsertInventory): Promise<Inventory> {
    const [item] = await db
      .insert(inventory)
      .values({
        ...insertInventory,
        updatedAt: new Date(),
      })
      .returning();
    return item;
  }

  async updateInventoryItem(id: string, updates: Partial<Inventory>): Promise<Inventory | undefined> {
    const [item] = await db
      .update(inventory)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return item || undefined;
  }

  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory);
  }

  async getLowStockItems(): Promise<Inventory[]> {
    return await db.select().from(inventory).where(sql`quantity_in_stock <= minimum_stock`);
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const result = await db.delete(inventory).where(eq(inventory.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Invoice management
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...insertInvoice,
        invoiceNumber,
        updatedAt: new Date(),
      })
      .returning();
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.customerId, customerId));
  }

  async getInvoicesByPlumber(plumberId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.plumberId, plumberId));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Invoice item management
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(insertItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const [item] = await db
      .insert(invoiceItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateInvoiceItem(id: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const [item] = await db
      .update(invoiceItems)
      .set(updates)
      .where(eq(invoiceItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // File management
  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values(insertFile)
      .returning();
    return file;
  }

  async getFilesByCustomer(customerId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.customerId, customerId));
  }

  async getFilesByCall(callId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.callId, callId));
  }

  async getFilesByInvoice(invoiceId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.invoiceId, invoiceId));
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Enhanced methods - database implementations
  async getNearbyPlumbers(lat: number, lng: number, maxDistance?: number): Promise<Plumber[]> {
    // For now, return all available plumbers - geolocation can be added later
    return this.getAvailablePlumbers();
  }

  async updatePlumberLocation(id: string, lat: number, lng: number): Promise<void> {
    // Location tracking can be added to schema later if needed
  }

  async updatePlumberFCMToken(id: string, fcmToken: string): Promise<void> {
    // FCM token tracking can be added to schema later if needed
  }

  async createCallWithLocation(call: InsertCall, lat: number, lng: number): Promise<Call> {
    return this.createCall(call);
  }

  async getPendingCalls(): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.status, 'pending'));
  }

  async searchPlumbers(filters: any): Promise<Plumber[]> {
    return this.getAvailablePlumbers();
  }
}

// Use database storage if DATABASE_URL is available, otherwise use memory storage
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
