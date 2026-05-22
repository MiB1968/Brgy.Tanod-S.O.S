import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index";
import { AuthenticatedSocket, UserPayload } from "../types";
import { admin } from "../db/index";

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  const cookieHeader = socket.handshake.headers.cookie || '';
  
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(c => {
      const [key, val] = c.trim().split('=');
      cookies[key] = val;
    });
  }
  const cookieToken = cookies['token'];

  let token = 
    socket.handshake.auth.token || 
    cookieToken ||
    socket.handshake.headers.authorization?.split(" ")[1];

  if (token === 'cookie-auth') {
    token = cookieToken;
  }

  if (!token) {
    console.warn(`[SocketAuth] Authentication FAILED for socket ${socket.id}: No token provided. Handshake auth keys: ${Object.keys(socket.handshake.auth || {}).join(', ')}`);
    return next(new Error("Authentication required"));
  }

  try {
    // Check if it's a firebase token (Firebase JWTs are usually much longer and structured differently, but we can try verifyIdToken)
    let decodedUser: any = {};
    
    try {
      // Trying Firebase Auth first if admin is available
      if (admin && admin.apps.length > 0) {
        const decodedToken = await admin.auth().verifyIdToken(token);
        decodedUser = {
          id: decodedToken.uid,
          role: decodedToken.role || 'resident', // defaults to resident if custom claim missing
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email || 'Firebase User'
        };
      } else {
        throw new Error('Firebase Admin not initialized');
      }
    } catch (fbErr) {
      // Fallback to local JWT verification
      const decodedLocal = jwt.verify(token, config.jwtSecret) as any;
      decodedUser = {
        id: decodedLocal.id,
        role: decodedLocal.role,
        email: decodedLocal.email,
        name: decodedLocal.name || decodedLocal.email || 'Local User'
      };
    }
    
    // Set user data to socket
    (socket as AuthenticatedSocket).data = {
      user: {
        id: decodedUser.id,
        role: decodedUser.role?.toUpperCase() || "CITIZEN",
        barangayId: decodedUser.barangayId || "default",
        name: decodedUser.name,
        phone: decodedUser.phone
      }
    };

    console.log(`[SocketAuth] Authenticated user ${decodedUser.id} (${decodedUser.role}) for socket ${socket.id}`);
    next();
  } catch (err: any) {
    console.warn(`[SocketAuth] Authentication failed for socket ${socket.id}: ${err.message}`);
    next(new Error("Authentication error"));
  }
};
