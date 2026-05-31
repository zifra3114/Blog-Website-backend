// src/config/env.js
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const env = {
  // Hugging Face ke dynamic port ko prioritize karein, bina kisi default fallback hardcoding ke jo conflict kare
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 7860,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // CLIENT_URL ab backend logic se bypass ho chuka hai, default safe rakha hai backup ke liye
  CLIENT_URL: process.env.CLIENT_URL || '*',

  // Database ── Securely handling both variations smoothly
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI,
  MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@blog.com',
};

export default env;