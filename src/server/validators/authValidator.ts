import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['resident', 'tanod', 'admin', 'superadmin']).optional(),
  details: z.object({
    phone: z.string().optional(),
    address: z.string().optional(),
    gpsLat: z.number().optional(),
    gpsLng: z.number().optional(),
  }).optional(),
});
