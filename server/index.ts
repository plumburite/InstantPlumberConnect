import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureDatabaseReady } from "./migrate";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Production logging middleware - minimal logging for performance
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Only log errors in production
    res.on("finish", () => {
      if (res.statusCode >= 400) {
        console.error(`${req.method} ${req.path} ${res.statusCode}`);
      }
    });
  }
  next();
});

(async () => {
  // Ensure database is ready before starting server (for production deployment)
  try {
    await ensureDatabaseReady();
  } catch (error) {
    console.error('Failed to initialize database on startup:', error);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only send response if headers haven't been sent already
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error('Server error:', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
