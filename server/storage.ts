import { type Plumber, type InsertPlumber, type Call, type InsertCall, type User, type InsertUser, plumbers, calls } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { MongoDBStorage } from './mongodb-storage';
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
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
  
  // Legacy user methods for auth compatibility
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  private plumbers: Map<string, Plumber>;
  private calls: Map<string, Call>;
  public sessionStore: session.Store;

  constructor() {
    this.plumbers = new Map();
    this.calls = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with some mock plumbers for testing
    this.seedPlumbers();
  }

  private seedPlumbers() {
    const mockPlumbers: InsertPlumber[] = [
      {
        email: "mike@petersonplumbing.com",
        password: "$2a$10$hash", // Will be properly hashed in auth
        firstName: "Mike",
        lastName: "Peterson",
        company: "Peterson Plumbing LLC",
        licenseNumber: "PLB-2024-001",
        serviceRadius: 25,
      },
      {
        email: "sarah@quickfix.com", 
        password: "$2a$10$hash",
        firstName: "Sarah",
        lastName: "Johnson",
        company: "QuickFix Plumbing",
        licenseNumber: "PLB-2024-002",
        serviceRadius: 15,
      },
    ];

    mockPlumbers.forEach(async (plumber) => {
      const created = await this.createPlumber(plumber);
      // Set some as available
      await this.updatePlumber(created.id, { isAvailable: true });
    });
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
      customerName: insertCall.customerName || null,
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

// Use database storage if DATABASE_URL is available, otherwise use MongoDB or memory storage
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : (process.env.MONGODB_URI ? new MongoDBStorage() : new MemStorage());
