import dns from "node:dns/promises";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config(); // 🚨 Sabse upar secure environment variables loading

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";

// ✅ FIXED PATHS (Assuming server.js is inside 'src' folder as per your structure)
import env from "./config/env.js";
import logger from "./config/logger.js";
import routes from "./routes/index.js";
import connectDB from "./config/db.js";

import { apiLimiter } from "./middlewares/rateLimiter.js";
import errorHandler from "./middlewares/errorHandler.js";
import ApiError from "./utils/ApiError.js";

const app = express();

// ─── Security Middleware ───────────────────────────────────────
app.use(helmet());

// ✅ FIXED CORS: Dynamic origin resolution with credentials support
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or postman)
      if (!origin) return callback(null, true);
      return callback(null, true); // Dynamically allow any origin requesting
    },
    credentials: true, // Cookies aur Authorization headers ke liye lazmi hai
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cookie",
    ],
  }),
);

app.use("/api/", apiLimiter);
app.use(mongoSanitize());

// ─── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────────────────
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (msg) => logger.info(msg.trim()),
      },
    }),
  );
}

// ─── API routes ────────────────────────────────────────────────
app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.send("Backend Running Successfully on Hugging Face 🚀");
});

// ─── 404 handler ───────────────────────────────────────────────
app.all("*", (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// ─── Global error handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Server Listening & DB Connection ──────────────────────────
const PORT = process.env.PORT || 5000;

// ✅ FIXED: Top-level await ki jagah structured connection handler
const startServer = async () => {
  try {
    await connectDB();
    logger.info("Database connected successfully! 🎉");

    app.listen(PORT, () => {
      console.log(`\n🚀 =================================================`);
      console.log(`   Backend is running perfectly on port: ${PORT}`);
      console.log(`==================================================== 🚀\n`);
    });
  } catch (error) {
    console.error("❌ Server startup failed due to DB connection error:", error);
    process.exit(1); // Server stop kar do agar DB connect na ho
  }
};

startServer();

export default app;