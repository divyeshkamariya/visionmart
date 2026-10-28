import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import orderRoutes from "./routes/orders.js";
import productRoutes from "./routes/products.js";

const app = express();

app.disable("x-powered-by");

// Needed on Render/Railway etc. so rate limiting sees the real client IP.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security headers
app.use(helmet());

// Request logging (skipped while running tests)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin is not allowed by CORS.");
      error.status = 403;
      return callback(error);
    },
  })
);

app.use(express.json({ limit: "100kb" }));

// Rate limiting
// General limit for the whole API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

// Strict limit for login/register to slow down password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "VisionMart API",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);

// Handle unknown API routes
app.use((_req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

// Global error handler
app.use((error, _req, res, _next) => {
  // Duplicate key (e.g. email already registered)
  if (error?.code === 11000) {
    return res.status(409).json({
      message: "That value is already registered.",
    });
  }

  // Mongoose schema validation failed
  if (error?.name === "ValidationError") {
    const message =
      Object.values(error.errors ?? {})
        .map((item) => item.message)
        .join(" ") || "Invalid data.";

    return res.status(400).json({ message });
  }

  // Bad ObjectId etc.
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid value provided." });
  }

  // Malformed JSON body
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON." });
  }

  // Errors we raised ourselves with a client-safe status (e.g. CORS 403, body too large 413)
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);

  res.status(500).json({
    message: "Unexpected server error.",
  });
});

export default app;
