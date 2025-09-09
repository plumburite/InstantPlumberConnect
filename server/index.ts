import * as express from "express";
import { setupVite, serveStatic, log } from "./vite";

// Express 2.5.11 uses createServer() instead of express()
const app = express.createServer();

// Simple logging middleware for Express 2.5.11
app.use((req: any, res: any, next: any) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.url && req.url.startsWith("/api")) {
      log(`${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Simple JSON response helper for Express 2.5.11
app.use((req: any, res: any, next: any) => {
  if (!res.json) {
    res.json = function(obj: any) {
      res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
  }
  next();
});

// Simple route setup without async wrapper  
import { storage } from "./storage";

// Basic test route
app.get("/api/health", (req: any, res: any) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.json({ message });
});

// Setup development or production serving
if (process.env.NODE_ENV === "development") {
  setupVite(app, app).then(() => {
    console.log("Vite setup complete");
  }).catch(err => {
    console.error("Vite setup failed:", err);
  });
} else {
  serveStatic(app);
}

// Start server
const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);
});
