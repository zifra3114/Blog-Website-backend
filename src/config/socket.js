import { Server } from "socket.io";
import { verifyAccessToken } from "../../../server/src/utils/tokens.js";
import { User } from "../../../server/src/models/index.js";
import logger from "./logger.js";

let io = null;

// Map userId -> Set of socketIds (supports multiple tabs/devices)
const onlineUsers = new Map();

/**
 * Initialize Socket.io server.
 */
export const initSocket = (httpServer, corsOptions) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  // ─── Authentication middleware ───────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        logger.warn("Socket connection without token");
        return next(new Error("Authentication required"));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).select(
        "_id name username avatar isActive",
      );

      if (!user || !user.isActive) {
        logger.warn(
          `Socket auth failed: user not found or inactive (${decoded.sub})`,
        );
        return next(new Error("User not found or inactive"));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn("Socket auth failed:", err.message);
      next(new Error("Invalid token"));
    }
  });

  // ─── Connection handler ─────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    // Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    logger.info(`Socket connected: ${socket.user.username} (${socket.id})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      logger.info(`Socket disconnected: ${socket.user.username} (${reason})`);
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error(`Socket error for ${socket.user.username}:`, error);
    });
  });

  return io;
};

/**
 * Get the Socket.io instance.
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

/**
 * Check if a user is online.
 */
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

/**
 * Emit an event to a specific user (all their connected sockets).
 */
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
};

/**
 * Emit to multiple users.
 */
export const emitToUsers = (userIds, event, data) => {
  if (!io) return;
  userIds.forEach((userId) => {
    io.to(`user:${userId.toString()}`).emit(event, data);
  });
};

export default { initSocket, getIO, isUserOnline, emitToUser, emitToUsers };
