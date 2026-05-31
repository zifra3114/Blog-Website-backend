import mongoose from 'mongoose';
import dns from 'dns'; // 🚨 Node.js ka built-in DNS module import karein
import env from './env.js';
import logger from './logger.js';

// 🚨 Node.js ko force karein ke wo pehle IPv4 addresses ko resolve kare
// Is se local network/ISP ka 'querySrv ECONNREFUSED' block bypass ho jata hai
dns.setDefaultResultOrder('ipv4first');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {   
    const connString = env.MONGODB_URI || process.env.MONGODB_URI;

    if (!connString) {
      throw new Error("Database URI is completely undefined. Check your .env file.");
    }

    logger.info("🔄 Connecting to MongoDB (Direct String Bypass)...");

    const conn = await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 15000,
    });

    isConnected = true;
    logger.info("✅ MongoDB Connected Successfully!");
    return conn;
  } catch (error) {
    logger.error("❌ MongoDB Connection Error:", {
      message: error.message,
      code: error.code
    });
    throw error; 
  }
};

export default connectDB;