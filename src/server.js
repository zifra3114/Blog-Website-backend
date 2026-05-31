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

import env from "../../Blog-backend/src/config/env.js";
import logger from "../../Blog-backend/src/config/logger.js";
import routes from "./routes/index.js";
import connectDB from "../../Blog-backend/src/config/db.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import errorHandler from "./middlewares/errorHandler.js";
import ApiError from "./utils/ApiError.js";

const app = express();

// ✅ Connect DB once variables are properly loaded
await connectDB();

// ─── Security Middleware ───────────────────────────────────────
app.use(helmet());

// ✅ Updated: Open CORS setup (Ab backend ko frontend ke URL ki parwah nahi)
app.use(
  cors({
    origin: true, // Har incoming request origin ko auto-allow karega (Dynamic & Independent)
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

// ─── Server Listening (Hugging Face Dynamic Port Compatible) ───
// Hugging Face automatically 7860 assign karega, local par yeh 5000 lega.
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 =================================================`);
  console.log(`   Backend is running perfectly on port: ${PORT}`);
  console.log(`==================================================== 🚀\n`);
});

export default app;
