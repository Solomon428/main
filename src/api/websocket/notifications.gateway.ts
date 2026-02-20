// ============================================================================
// WebSocket Gateway for Real-time Notifications
// ============================================================================

import { Server as HTTPServer } from "http";
import { prisma } from "../../lib/prisma";
import { info, error } from "../../observability/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let io: any = null;

/**
 * Initialize WebSocket server
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initializeWebSocket(server: HTTPServer): any {
  // Dynamically import socket.io to avoid type errors when not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
      credentials: true,
    },
    path: "/ws",
  });

  // Authentication middleware
  io.use(async (socket: any, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      // Validate token (implement your token validation)
      // const user = await validateToken(token);
      // socket.data.user = user;

      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: any) => {
    info(`Client connected: ${socket.id}`);

    // Join organization room
    socket.on("join-organization", (orgId: string) => {
      socket.join(`org:${orgId}`);
      info(`Socket ${socket.id} joined organization ${orgId}`);
    });

    // Join user room
    socket.on("join-user", (userId: string) => {
      socket.join(`user:${userId}`);
      info(`Socket ${socket.id} joined user ${userId}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Send notification to user via WebSocket
 */
export function sendToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;

  io.to(`user:${userId}`).emit(event, data);
  info(`Sent ${event} to user ${userId}`);
}

/**
 * Send notification to organization
 */
export function sendToOrganization(
  organizationId: string,
  event: string,
  data: unknown,
): void {
  if (!io) return;

  io.to(`org:${organizationId}`).emit(event, data);
  info(`Sent ${event} to organization ${organizationId}`);
}

/**
 * Broadcast to all connected clients
 */
export function broadcast(event: string, data: unknown): void {
  if (!io) return;

  io.emit(event, data);
  info(`Broadcast ${event} to all clients`);
}

/**
 * Get connected clients count
 */
export function getConnectedClientsCount(): number {
  if (!io) return 0;
  return io.engine.clientsCount;
}

/**
 * Close WebSocket server
 */
export function closeWebSocket(): void {
  if (io) {
    io.close();
    io = null;
  }
}

export { io };
