const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const connectDB = require("./config/db");
const { getJwtSecret, isOriginAllowed } = require("./config/security");
const { publicUploadsDir } = require("./middleware/upload");
const {
  blockSensitivePaths,
  sanitizeRequest,
  apiLimiter,
} = require("./middleware/security");

// Load environment variables from root or server directory
[
  path.join(__dirname, "..", ".env"),
  path.join(__dirname, ".env"),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

async function startServer() {
  // Initialize JWT signing secret (uses configured JWT_SECRET or ephemeral CSPRNG fallback)
  getJwtSecret();

  await connectDB();

  const app = express();
  const rootDir = path.join(__dirname, "..");
  const isProd = process.env.NODE_ENV === "production";

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(blockSensitivePaths);

  app.use(
    helmet({
      frameguard: false, 
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'self'"],
          "script-src": isProd ? ["'self'"] : ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
          "connect-src": ["'self'"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "form-action": ["'self'"],
        },
      },
    })
  );

  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });

  app.use(
    cors((req, callback) => {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (isOriginAllowed(origin, host)) {
        callback(null, {
          origin: origin || false,
          credentials: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
          allowedHeaders: ["Content-Type", "Authorization"],
          maxAge: 600,
        });
      } else {
        callback(Object.assign(new Error("Origin not allowed by CORS policy"), { status: 403 }));
      }
    })
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  const clientDir = path.join(rootDir, "client");
  const clientAssetsDir = fs.existsSync(path.join(clientDir, "public", "assets"))
    ? path.join(clientDir, "public", "assets")
    : path.join(rootDir, "public", "assets");

  app.use(
    "/uploads",
    express.static(publicUploadsDir, {
      dotfiles: "deny",
      index: false,
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=86400");
      },
    })
  );
  app.use(
    "/assets",
    express.static(clientAssetsDir, {
      dotfiles: "deny",
      index: false,
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    })
  );

  // Global API rate limiting + NoSQL/prototype-pollution sanitization
  app.use("/api", apiLimiter, sanitizeRequest);

  // Prevent browser/proxy caching of sensitive authenticated responses
  app.use(["/api/auth", "/api/users", "/api/admin"], (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    next();
  });

  // API Routes
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/listings", require("./routes/listings"));
  app.use("/api/users", require("./routes/users"));
  app.use("/api/admin", require("./routes/admin"));

  // Minimal health check (no internal environment or version details)
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // 404 for unknown API endpoints
  app.use("/api", (req, res) => {
    res.status(404).json({ success: false, message: "API endpoint not found" });
  });

  // Frontend serving: Vite middleware in development, static dist in production
  const distDir = fs.existsSync(path.join(clientDir, "dist"))
    ? path.join(clientDir, "dist")
    : path.join(rootDir, "dist");

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: clientDir,
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { dotfiles: "deny" }));
    app.use((req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  // Safe global error handler — never leaks stack traces or raw internal errors
  app.use((err, req, res, _next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.code === "LIMIT_FILE_SIZE" ? "File size exceeds 5MB limit" : "Invalid file upload",
      });
    }
    if (err?.status === 403 && err.message === "Origin not allowed by CORS policy") {
      return res.status(403).json({ success: false, message: "Origin not allowed" });
    }
    if (err?.type === "entity.too.large") {
      return res.status(413).json({ success: false, message: "Request payload too large" });
    }
    if (err?.status === 400 || err?.type === "entity.parse.failed") {
      return res.status(400).json({ success: false, message: "Invalid request payload" });
    }
    if (err?.message && err.message.includes("Only .jpg, .jpeg, .png, and .webp")) {
      return res.status(400).json({ success: false, message: err.message });
    }

    console.error("[Server] Unhandled error:", err?.message || "Unknown error");
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  });

  const PORT = Number(process.env.PORT) || 5000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`RentMe server listening on http://0.0.0.0:${PORT} (${isProd ? "production" : "development"})`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`[Server] Port ${PORT} is already in use; backend server is already running.`);
    } else {
      console.error("[Server] Error:", err.message);
      process.exit(1);
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
