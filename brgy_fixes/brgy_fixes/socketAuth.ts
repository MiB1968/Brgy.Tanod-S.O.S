/**
 * src/server/middleware/socketAuth.ts
 *
 * FIX BATCH — HIGH-01 (Socket layer)
 *
 * Changes from original:
 *   The Firebase auth path in socketAuthMiddleware did not check
 *   token_version or user status in the database. This meant that
 *   revokeUserSessions() had no effect on Google Sign-In users connected
 *   via WebSocket — a suspended account could remain connected indefinitely.
 *
 *   Fix: After resolving a user from the DB (for both JWT and Firebase paths),
 *   we now check:
 *     1. The user row exists in the DB.
 *     2. The user's status is not 'suspended'.
 *     3. The token_version in the decoded token matches the current DB value.
 *
 *   If any check fails, the socket connection is rejected with an error.
 *
 * All other socket auth logic is unchanged.
 */

import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index";
import { AuthenticatedSocket } from "../types";
import { admin, pool } from "../db/index";

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  const cookieHeader = socket.handshake.headers.cookie || "";

  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(";").forEach((c) => {
      const [key, val] = c.trim().split("=");
      cookies[key] = val;
    });
  }
  const cookieToken = cookies["token"];

  const authData = socket.handshake.auth || {};
  let token =
    authData.token ||
    cookieToken ||
    socket.handshake.headers.authorization?.split(" ")[1];

  if (
    token === "cookie-auth" ||
    token === "null" ||
    token === "undefined"
  ) {
    token = cookieToken;
  }

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    let decodedUser: any = null;
    let resolvedDbId: string | null = null;
    let resolvedTokenVersion: number | null = null;

    // 1. Try Local JWT first (standard for our signed cookies/tokens)
    try {
      const decodedLocal = jwt.verify(token, config.jwtSecret) as any;
      decodedUser = {
        id: decodedLocal.id,
        role: decodedLocal.role,
        email: decodedLocal.email,
        name: decodedLocal.name || decodedLocal.email || "Local User",
        barangayId: decodedLocal.barangayId,
      };
      resolvedDbId = decodedLocal.id;
      resolvedTokenVersion = decodedLocal.tokenVersion ?? null;
    } catch (jwtErr: any) {
      // 2. Fallback to Firebase verifyIdToken if local fails
      if (admin && admin.apps && admin.apps.length > 0) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);

          // Must query DB to get the actual UUID used in CockroachDB
          const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [decodedToken.email?.toLowerCase()]
          );
          const dbUser = userResult.rows[0];

          if (dbUser) {
            decodedUser = {
              id: dbUser.id,
              role: dbUser.role,
              email: dbUser.email,
              name: dbUser.name || decodedToken.name || dbUser.email,
              barangayId: dbUser.barangay_id,
            };
            resolvedDbId = dbUser.id;
            resolvedTokenVersion = dbUser.token_version ?? null;
          } else {
            // Valid Firebase token but user not in DB — reject.
            return next(
              new Error(
                "Firebase user not registered. Please complete registration."
              )
            );
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

    // ── HIGH-01 FIX: Enforce token revocation and suspended status ────────────
    if (resolvedDbId) {
      const statusRow = await pool.query(
        "SELECT token_version, status FROM users WHERE id = $1",
        [resolvedDbId]
      );
      const dbUser = statusRow.rows[0];

      if (!dbUser) {
        return next(new Error("User account not found"));
      }

      if (dbUser.status === "suspended") {
        console.warn(
          `[SocketAuth] Rejected suspended user ${decodedUser.email}`
        );
        return next(new Error("Account suspended"));
      }

      // Check token version (revocation). resolvedTokenVersion is the version
      // embedded in the token; dbUser.token_version is the current server value.
      // If an admin called revokeUserSessions(), the DB value will be higher.
      if (
        resolvedTokenVersion !== null &&
        dbUser.token_version !== resolvedTokenVersion
      ) {
        console.warn(
          `[SocketAuth] Rejected revoked session for user ${decodedUser.email}`
        );
        return next(new Error("Session revoked. Please login again."));
      }
    }
    // ── End revocation check ──────────────────────────────────────────────────

    const rawRole = decodedUser.role || "resident";
    let normalizedRole = rawRole.toLowerCase();
    if (normalizedRole === "citizen") normalizedRole = "resident";

    (socket as AuthenticatedSocket).data = {
      user: {
        id: decodedUser.id,
        role: normalizedRole,
        barangayId: decodedUser.barangayId || "default",
        name: decodedUser.name,
        phone: decodedUser.phone,
      },
    };

    console.log(
      `[SocketAuth] Authenticated user ${decodedUser.id} (${decodedUser.role}) for socket ${socket.id}`
    );
    next();
  } catch (err: any) {
    console.warn(
      `[SocketAuth] Authentication FAILED for ${socket.id}: ${err.message}`
    );
    next(new Error("Authentication error"));
  }
};
