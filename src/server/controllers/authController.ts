import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index';
import { config } from '../config/index';
import * as response from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { logAction } from '../services/auditService';

export const register = async (req: Request, res: Response) => {
  const { email, password, name, role, details } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return response.error(res, "Email already registered", "CONFLICT", 409);
    }

    const hashedPass = await bcrypt.hash(password, 10);
    const result = await client.query(
      "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, status",
      [email, hashedPass, name, role || 'resident', (role === 'admin' || role === 'superadmin') ? 'verified' : 'pending']
    );
    const user = result.rows[0];

    if (role === 'resident' && details) {
      await client.query(
        "INSERT INTO residents (id, name, phone, address, house_number, household_size, blood_type, medical_conditions, emergency_contact_name, emergency_contact_phone, gps_lat, gps_lng) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
        [user.id, name, details.phone, details.address, details.houseNumber, details.householdSize, details.bloodType, details.medicalConditions, details.emergencyContactName, details.emergencyContactPhone, details.gpsLat, details.gpsLng]
      );
    } else if (role === 'tanod') {
      await client.query("INSERT INTO patrols (tanod_id, tanod_name, is_active, status) VALUES ($1, $2, false, 'offline')", [user.id, name]);
    }

    await logAction(user.id, 'USER_REGISTERED', 'users', user.id, { role: user.role });
    await client.query('COMMIT');
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    return response.success(res, { user, token }, "Registration successful", 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    response.error(res, err.message);
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return response.error(res, "Invalid credentials", "UNAUTHORIZED", 401);
    }
    
    await logAction(user.id, 'USER_LOGIN', 'users', user.id);
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    const { password: _, ...userWithoutPass } = user;
    return response.success(res, { user: userWithoutPass, token }, "Login successful");
  } catch (err: any) {
    response.error(res, err.message);
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'none' });
  return response.success(res, null, "Logged out successfully");
};

export const me = async (req: AuthRequest, res: Response) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return response.error(res, "Not authenticated", "UNAUTHORIZED", 401);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const result = await pool.query("SELECT id, email, name, role, status FROM users WHERE id = $1", [decoded.id]);
    const user = result.rows[0];
    if (!user) return response.error(res, "User not found", "NOT_FOUND", 404);
    return response.success(res, user);
  } catch (err) {
    return response.error(res, "Invalid token", "UNAUTHORIZED", 401);
  }
};
