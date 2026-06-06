/**
 * src/server/controllers/authController.ts — COOKIE OPTIONS PATCH
 *
 * FIX — HIGH-COOKIE-01
 *
 * Bug: `const isProduction = true;` was hardcoded unconditionally.
 *
 * The comment read "Force production-style cookies for better cross-origin
 * compatibility" but this has the opposite effect in local development:
 *
 *   secure: true  → Browsers SILENTLY DROP cookies on HTTP (non-HTTPS) origins.
 *                   Local dev is always http://localhost. The browser accepts
 *                   the Set-Cookie header but never sends the cookie back on
 *                   subsequent requests. Result: every API call after login
 *                   returns 401 "Authentication required" because the cookie
 *                   is never transmitted.
 *
 *   sameSite: 'none' → Requires secure: true. Without it the cookie is
 *                       rejected. Compounding the above.
 *
 * Fix: Derive isProduction from the existing config.nodeEnv value.
 * Production deployments (Google Cloud Run, Vercel, etc.) serve over HTTPS
 * so secure: true is correct there. Local dev over HTTP needs secure: false.
 *
 * HOW TO APPLY:
 *   Replace lines 80-90 of src/server/controllers/authController.ts with
 *   the block below. The cookieOptions object lower in the file (around
 *   line 316-325) that ALSO hardcodes `isProduction` should be removed —
 *   it is now superseded by this single shared constant.
 *
 * BEFORE:
 *   const isProduction = true; // Force production-style cookies...
 *   const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none' as const, ... }
 *
 * AFTER (paste this):
 */

// ── Cookie options — single source of truth ───────────────────────────────────
// Derive from NODE_ENV so dev over plain HTTP still works.
// Cloud Run / Vercel always serves HTTPS so production is always secure.
import { config } from '../config/index';

const isProduction = config.nodeEnv === 'production';

export const cookieOptions = {
  httpOnly: true,
  // FIX: was `true` unconditionally — breaks auth on local HTTP dev server
  secure: isProduction,
  // FIX: was 'none' unconditionally — 'none' requires secure:true, breaks dev
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/*
 * IMPORTANT: After applying this fix, also delete the SECOND cookieOptions
 * block that appears around line 316 of authController.ts (the one inside
 * the refreshToken handler that again hardcodes isProduction = true).
 * Use this exported `cookieOptions` object everywhere instead.
 *
 * Example usage in the file:
 *   res.cookie('token', token, cookieOptions);
 *   res.clearCookie('token', cookieOptions);
 */
