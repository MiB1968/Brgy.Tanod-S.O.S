import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index";
import { AuthenticatedSocket } from "../types";
import { admin, pool } from "../db/index";

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

  const authData = socket.handshake.auth || {};
  let token = 
    authData.token || 
    cookieToken ||
    socket.handshake.headers.authorization?.split(" ")[1];

  if (token === 'cookie-auth' || token === 'null' || token === 'undefined') {
    token = cookieToken;
  }

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    let decodedUser: any = null;
    
    // 1. Try Local JWT first (standard for our signed cookies/tokens)
    try {
      const decodedLocal = jwt.verify(token, config.jwtSecret) as any;
      decodedUser = {
        id: decodedLocal.id,
        role: decodedLocal.role,
        email: decodedLocal.email,
        name: decodedLocal.name || decodedLocal.email || 'Local User',
        barangayId: decodedLocal.barangayId
      };
    } catch (jwtErr: any) {
      // 2. Fallback to Firebase verifyIdToken if local fails
      if (admin && admin.apps && admin.apps.length > 0) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          
          // Must query DB to get the actual UUID used in CockroachDB
          const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [decodedToken.email?.toLowerCase()]
          );
          const dbUser = userResult.rows[0];

          if (dbUser) {
            decodedUser = {
              id: dbUser.id,
              role: dbUser.role,
              email: dbUser.email,
              name: dbUser.name || decodedToken.name || dbUser.email,
              barangayId: dbUser.barangay_id
            };
          } else {
            // Fallback for missing user in DB but valid Firebase token
            decodedUser = {
              id: decodedToken.uid,
              role: decodedToken.role || 'resident',
              email: decodedToken.email,
              name: decodedToken.name || decodedToken.email || 'Firebase User'
            };
          }
        } catch (fbErr: any) {
          throw fbErr;
        }
      } else {
        throw jwtErr;
      }
    }
    
    if (!decodedUser) {
      throw new Error("User identity could not be verified");
    }

    // Set user data to socket
    const rawRole = decodedUser.role || "resident";
    let normalizedRole = rawRole.toLowerCase();
    if (normalizedRole === 'citizen') normalizedRole = 'resident';

    (socket as AuthenticatedSocket).data = {
      user: {
        id: decodedUser.id,
        role: normalizedRole,
        barangayId: decodedUser.barangayId || "default",
        name: decodedUser.name,
        phone: decodedUser.phone
      }
    };

    console.log(`[SocketAuth] Authenticated user ${decodedUser.id} (${decodedUser.role}) for socket ${socket.id}`);
    next();
  } catch (err: any) {
    console.warn(`[SocketAuth] Authentication FAILED for ${socket.id}: ${err.message}`);
    next(new Error("Authentication error"));
  }
};
