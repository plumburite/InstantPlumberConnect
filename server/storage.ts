import { type Plumber, type InsertPlumber, type Call, type InsertCall, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { MongoDBStorage } from './mongodb-storage';

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

// Use MongoDB storage if MONGODB_URI is provided, otherwise use memory storage
export const storage = process.env.MONGODB_URI ? new MongoDBStorage() : new MemStorage();
