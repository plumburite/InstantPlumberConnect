import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCallSchema } from "@shared/schema";
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

  return httpServer;
}
