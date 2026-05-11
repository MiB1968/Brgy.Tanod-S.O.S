import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index";
import { AuthenticatedSocket, UserPayload } from "../types";

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  // Parse cookies from headers
  const cookieHeader = socket.handshake.headers.cookie || '';
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(c => {
      const [key, val] = c.trim().split('=');
      cookies[key] = val;
    });
  }
  const cookieToken = cookies['token'];

  const token = 
    socket.handshake.auth.token || 
    cookieToken ||
    socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    console.warn(`[SocketAuth] Missing token for socket ${socket.id}`);
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Set user data to socket
    (socket as AuthenticatedSocket).data = {
      user: {
        id: decoded.id,
        role: decoded.role?.toUpperCase() || "CITIZEN",
        barangayId: decoded.barangayId || "default",
        name: decoded.name || decoded.email || "Anonymous",
        phone: decoded.phone
      }
    };

    console.log(`[SocketAuth] Authenticated user ${decoded.id} (${decoded.role}) for socket ${socket.id}`);
    next();
  } catch (err: any) {
    console.warn(`[SocketAuth] Authentication failed for socket ${socket.id}: ${err.message}`);
    next(new Error("Authentication error"));
  }
};
