import { type Plumber, type InsertPlumber, type Call, type InsertCall, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import connectMongo from "connect-mongodb-session";
import { PlumberModel, CallModel, connectDatabase } from './database';
import { IStorage } from './storage';

const MongoDBStore = connectMongo(session);

export class MongoDBStorage implements IStorage {
  public sessionStore: session.Store;
  private isConnected: boolean = false;

  constructor() {
    // Initialize MongoDB session store
    this.sessionStore = new MongoDBStore({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/plumber-connect',
      collection: 'sessions',
    });
    
    // Connect to database
    this.connect();
  }

  private async connect() {
    if (!this.isConnected) {
      await connectDatabase();
      this.isConnected = true;
    }
  }

  // Plumber management
  async getPlumber(id: string): Promise<Plumber | undefined> {
    await this.connect();
    const plumber = await PlumberModel.findById(id).lean();
    if (!plumber) return undefined;
    
    return {
      id: plumber._id,
      email: plumber.email,
      password: plumber.password,
      firstName: plumber.firstName,
      lastName: plumber.lastName,
      company: plumber.company,
      licenseNumber: plumber.licenseNumber,
      serviceRadius: plumber.serviceRadius,
      isAvailable: plumber.isAvailable,
      rating: plumber.rating,
      totalReviews: plumber.totalReviews,
      createdAt: plumber.createdAt,
    };
  }

  async getPlumberByEmail(email: string): Promise<Plumber | undefined> {
    await this.connect();
    const plumber = await PlumberModel.findOne({ email: email.toLowerCase() }).lean();
    if (!plumber) return undefined;
    
    return {
      id: plumber._id,
      email: plumber.email,
      password: plumber.password,
      firstName: plumber.firstName,
      lastName: plumber.lastName,
      company: plumber.company,
      licenseNumber: plumber.licenseNumber,
      serviceRadius: plumber.serviceRadius,
      isAvailable: plumber.isAvailable,
      rating: plumber.rating,
      totalReviews: plumber.totalReviews,
      createdAt: plumber.createdAt,
    };
  }

  async createPlumber(insertPlumber: InsertPlumber): Promise<Plumber> {
    await this.connect();
    const plumber = new PlumberModel({
      ...insertPlumber,
      email: insertPlumber.email.toLowerCase(),
    });
    
    const saved = await plumber.save();
    
    return {
      id: saved._id,
      email: saved.email,
      password: saved.password,
      firstName: saved.firstName,
      lastName: saved.lastName,
      company: saved.company,
      licenseNumber: saved.licenseNumber,
      serviceRadius: saved.serviceRadius,
      isAvailable: saved.isAvailable,
      rating: saved.rating,
      totalReviews: saved.totalReviews,
      createdAt: saved.createdAt,
    };
  }

  async updatePlumber(id: string, updates: Partial<Plumber>): Promise<Plumber | undefined> {
    await this.connect();
    const plumber = await PlumberModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    
    if (!plumber) return undefined;
    
    return {
      id: plumber._id,
      email: plumber.email,
      password: plumber.password,
      firstName: plumber.firstName,
      lastName: plumber.lastName,
      company: plumber.company,
      licenseNumber: plumber.licenseNumber,
      serviceRadius: plumber.serviceRadius,
      isAvailable: plumber.isAvailable,
      rating: plumber.rating,
      totalReviews: plumber.totalReviews,
      createdAt: plumber.createdAt,
    };
  }

  async getAvailablePlumbers(): Promise<Plumber[]> {
    await this.connect();
    const plumbers = await PlumberModel.find({ isAvailable: true }).lean();
    
    return plumbers.map(plumber => ({
      id: plumber._id,
      email: plumber.email,
      password: plumber.password,
      firstName: plumber.firstName,
      lastName: plumber.lastName,
      company: plumber.company,
      licenseNumber: plumber.licenseNumber,
      serviceRadius: plumber.serviceRadius,
      isAvailable: plumber.isAvailable,
      rating: plumber.rating,
      totalReviews: plumber.totalReviews,
      createdAt: plumber.createdAt,
    }));
  }

  async getNearbyPlumbers(lat: number, lng: number, maxDistance: number = 50000): Promise<Plumber[]> {
    await this.connect();
    const plumbers = await PlumberModel.find({
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat], // MongoDB uses [longitude, latitude]
          },
          $maxDistance: maxDistance, // meters
        },
      },
    }).lean();

    return plumbers.map(plumber => ({
      id: plumber._id,
      email: plumber.email,
      password: plumber.password,
      firstName: plumber.firstName,
      lastName: plumber.lastName,
      company: plumber.company,
      licenseNumber: plumber.licenseNumber,
      serviceRadius: plumber.serviceRadius,
      isAvailable: plumber.isAvailable,
      rating: plumber.rating,
      totalReviews: plumber.totalReviews,
      createdAt: plumber.createdAt,
    }));
  }

  async updatePlumberLocation(id: string, lat: number, lng: number): Promise<void> {
    await this.connect();
    await PlumberModel.findByIdAndUpdate(id, {
      location: {
        type: 'Point',
        coordinates: [lng, lat], // MongoDB uses [longitude, latitude]
      },
      updatedAt: new Date(),
    });
  }

  async updatePlumberFCMToken(id: string, fcmToken: string): Promise<void> {
    await this.connect();
    await PlumberModel.findByIdAndUpdate(id, {
      fcmToken,
      updatedAt: new Date(),
    });
  }

  // Call management
  async getCall(id: string): Promise<Call | undefined> {
    await this.connect();
    const call = await CallModel.findById(id).lean();
    if (!call) return undefined;
    
    return {
      id: call._id,
      plumberId: call.plumberId,
      customerName: call.customerName,
      customerLocation: call.customerLocation,
      issueDescription: call.issueDescription,
      status: call.status,
      startTime: call.startTime,
      endTime: call.endTime,
      rating: call.rating,
      earnings: call.earnings,
    };
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    await this.connect();
    const call = new CallModel({
      ...insertCall,
    });
    
    const saved = await call.save();
    
    return {
      id: saved._id,
      plumberId: saved.plumberId,
      customerName: saved.customerName,
      customerLocation: saved.customerLocation,
      issueDescription: saved.issueDescription,
      status: saved.status,
      startTime: saved.startTime,
      endTime: saved.endTime,
      rating: saved.rating,
      earnings: saved.earnings,
    };
  }

  async createCallWithLocation(insertCall: InsertCall, lat: number, lng: number): Promise<Call> {
    await this.connect();
    const call = new CallModel({
      ...insertCall,
      customerCoordinates: {
        type: 'Point',
        coordinates: [lng, lat], // MongoDB uses [longitude, latitude]
      },
    });
    
    const saved = await call.save();
    
    return {
      id: saved._id,
      plumberId: saved.plumberId,
      customerName: saved.customerName,
      customerLocation: saved.customerLocation,
      issueDescription: saved.issueDescription,
      status: saved.status,
      startTime: saved.startTime,
      endTime: saved.endTime,
      rating: saved.rating,
      earnings: saved.earnings,
    };
  }

  async getCallsByPlumber(plumberId: string): Promise<Call[]> {
    await this.connect();
    const calls = await CallModel.find({ plumberId }).sort({ startTime: -1 }).lean();
    
    return calls.map(call => ({
      id: call._id,
      plumberId: call.plumberId,
      customerName: call.customerName,
      customerLocation: call.customerLocation,
      issueDescription: call.issueDescription,
      status: call.status,
      startTime: call.startTime,
      endTime: call.endTime,
      rating: call.rating,
      earnings: call.earnings,
    }));
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    await this.connect();
    const call = await CallModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    
    if (!call) return undefined;
    
    return {
      id: call._id,
      plumberId: call.plumberId,
      customerName: call.customerName,
      customerLocation: call.customerLocation,
      issueDescription: call.issueDescription,
      status: call.status,
      startTime: call.startTime,
      endTime: call.endTime,
      rating: call.rating,
      earnings: call.earnings,
    };
  }

  async getPendingCalls(): Promise<Call[]> {
    await this.connect();
    const calls = await CallModel.find({ status: 'pending' }).sort({ startTime: -1 }).lean();
    
    return calls.map(call => ({
      id: call._id,
      plumberId: call.plumberId,
      customerName: call.customerName,
      customerLocation: call.customerLocation,
      issueDescription: call.issueDescription,
      status: call.status,
      startTime: call.startTime,
      endTime: call.endTime,
      rating: call.rating,
      earnings: call.earnings,
    }));
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

  // Advanced filtering and search methods
  async searchPlumbers(filters: {
    rating?: number;
    serviceRadius?: number;
    company?: string;
    location?: { lat: number; lng: number; radius: number };
    sortBy?: 'rating' | 'reviews' | 'distance';
  }): Promise<Plumber[]> {
    await this.connect();
    
    let query: any = { isAvailable: true };
    
    if (filters.rating) {
      query.rating = { $gte: filters.rating.toString() };
    }
    
    if (filters.serviceRadius) {
      query.serviceRadius = { $gte: filters.serviceRadius };
    }
    
    if (filters.company) {
      query.company = { $regex: filters.company, $options: 'i' };
    }
    
    let queryBuilder = PlumberModel.find(query);
    
    if (filters.location) {
      queryBuilder = PlumberModel.find({
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [filters.location.lng, filters.location.lat],
            },
            $maxDistance: filters.location.radius * 1000, // Convert km to meters
          },
        },
      });
    }
    
    // Apply sorting
    if (filters.sortBy === 'rating') {
      queryBuilder = queryBuilder.sort({ rating: -1, totalReviews: -1 });
    } else if (filters.sortBy === 'reviews') {
      queryBuilder = queryBuilder.sort({ totalReviews: -1, rating: -1 });
    }
    
    const plumbers = await queryBuilder.lean();
    
    return plumbers.map(plumber => ({
      id: plumber._id,
      email: plumber.email,
      password: plumber.password,
      firstName: plumber.firstName,
      lastName: plumber.lastName,
      company: plumber.company,
      licenseNumber: plumber.licenseNumber,
      serviceRadius: plumber.serviceRadius,
      isAvailable: plumber.isAvailable,
      rating: plumber.rating,
      totalReviews: plumber.totalReviews,
      createdAt: plumber.createdAt,
    }));
  }
}