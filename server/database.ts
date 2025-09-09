import mongoose from 'mongoose';
import { Schema, model } from 'mongoose';
import { type Plumber, type Call } from "@shared/schema";

// MongoDB Connection
export async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plumber-connect';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB database');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Plumber Schema
const PlumberSchema = new Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  serviceRadius: {
    type: Number,
    required: true,
    default: 25,
    min: 1,
    max: 100,
  },
  isAvailable: {
    type: Boolean,
    required: true,
    default: false,
  },
  rating: {
    type: String,
    default: "4.9",
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
  fcmToken: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add geospatial index for location-based queries
PlumberSchema.index({ location: '2dsphere' });
PlumberSchema.index({ isAvailable: 1, location: 1 });

// Call Schema
const CallSchema = new Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  plumberId: {
    type: String,
    ref: 'Plumber',
    default: null,
  },
  customerName: {
    type: String,
    default: null,
  },
  customerLocation: {
    type: String,
    default: null,
  },
  customerCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
  issueDescription: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending',
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  earnings: {
    type: String,
    default: null,
  },
  sessionId: {
    type: String,
    default: null,
  },
  paymentIntentId: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add geospatial index for location-based call matching
CallSchema.index({ customerCoordinates: '2dsphere' });
CallSchema.index({ status: 1, createdAt: -1 });

// Update timestamps on save
PlumberSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

CallSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create models
export const PlumberModel = model('Plumber', PlumberSchema);
export const CallModel = model('Call', CallSchema);

// Type assertions for MongoDB documents
export interface PlumberDocument extends Omit<Plumber, 'id'> {
  _id: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  fcmToken?: string;
  updatedAt: Date;
}

export interface CallDocument extends Omit<Call, 'id'> {
  _id: string;
  customerCoordinates: {
    type: 'Point';
    coordinates: [number, number];
  };
  sessionId?: string;
  paymentIntentId?: string;
  updatedAt: Date;
}