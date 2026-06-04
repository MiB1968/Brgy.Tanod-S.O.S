import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  isGoogle: z.boolean().optional(),
  firebaseIdToken: z.string().optional(),
}).refine((data) => {
  if (data.isGoogle) {
    return !!data.firebaseIdToken;
  }
  return !!data.password && data.password.length >= 6;
}, {
  message: "Password is required for credentials login, and firebaseIdToken is required for Google login.",
  path: ["password"]
});

// ── SECURITY: Only public-facing roles allowed on self-registration ──────────
// Admin and super_admin accounts must be created by an existing admin
// through the admin panel, NEVER through this public endpoint.
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'), // raised from 6
  name: z.string().min(2).max(100),

  // Residents and Tanods can self-register. That's it.
  role: z.enum(['resident', 'tanod']).default('resident'),

  details: z
    .object({
      phone: z.string().optional(),
      address: z.string().optional(),
      houseNumber: z.string().optional(),
      householdSize: z.number().int().min(1).optional(),
      bloodType: z.string().optional(),
      medicalConditions: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
      medications: z.array(z.string()).optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      gpsLat: z.number().min(-90).max(90).optional(),
      gpsLng: z.number().min(-180).max(180).optional(),
    })
    .optional(),
});

// ── Schema for admins creating new admin/tanod accounts ─────────────────────
// Use this on a separate protected route, e.g. POST /api/admin/users
export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  autoGeneratePassword: z.boolean().optional(),
  name: z.string().min(2).max(100),
  role: z.enum(['resident', 'tanod', 'admin', 'super_admin']),
  details: z
    .object({
      phone: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      houseNumber: z.string().nullable().optional(),
      householdSize: z.number().int().min(1).optional(),
      bloodType: z.string().nullable().optional(),
      medicalConditions: z.union([z.string(), z.array(z.string())]).nullable().optional(),
      allergies: z.union([z.string(), z.array(z.string())]).nullable().optional(),
      medications: z.union([z.string(), z.array(z.string())]).nullable().optional(),
      emergencyContactName: z.string().nullable().optional(),
      emergencyContactPhone: z.string().nullable().optional(),
    })
    .optional(),
});
