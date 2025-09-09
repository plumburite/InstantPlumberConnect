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

// Serve client files (React source)
import * as fs from "fs";
import * as path from "path";

app.get("/src/*", (req: any, res: any) => {
  const filePath = path.join(process.cwd(), "client", req.url);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    
    if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
      contentType = 'application/javascript';
    } else if (ext === '.css') {
      contentType = 'text/css';
    } else if (ext === '.json') {
      contentType = 'application/json';
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath, 'utf8'));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
});

// Serve the main HTML file for all non-API routes
app.get("*", (req: any, res: any) => {
  if (!req.url.startsWith("/api") && !req.url.startsWith("/src")) {
    const indexPath = path.join(process.cwd(), "client", "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(indexPath, 'utf8'));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Instant Plumber Connect</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
      `);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: "API endpoint not found" }));
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.json({ message });
});

// Start server
const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);
});
