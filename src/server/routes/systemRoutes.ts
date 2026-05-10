import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { pool } from '../db/index';
import * as socketService from '../sockets/index';
import * as response from '../utils/response';

const router = Router();

router.post('/siren', authenticate, authorize(['admin', 'superadmin', 'tanod']), async (req, res) => {
  const { sirenActive } = req.body;
  try {
    await pool.query(
      "INSERT INTO system_config (key, data, updated_at) VALUES ('siren', $1, now()) ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()",
      [JSON.stringify({ sirenActive })]
    );
    socketService.emitToAll("siren_update", { sirenActive });
    response.success(res, { sirenActive });
  } catch (err: any) {
    response.error(res, err.message);
  }
});

router.patch('/users/:id', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  const { status, role } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  
  if (status) { updates.push(`status = $${i++}`); values.push(status); }
  if (role) { updates.push(`role = $${i++}`); values.push(role); }
  
  if (updates.length === 0) return response.error(res, "Nothing to update", "BAD_REQUEST", 400);
  
  values.push(req.params.id);
  
  try {
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) return response.error(res, "User not found", "NOT_FOUND", 404);
    
    const updatedUser = result.rows[0];
    socketService.emitToAll("tanod_update", { id: updatedUser.id, status: updatedUser.status, role: updatedUser.role });
    
    response.success(res, updatedUser);
  } catch (err: any) {
    response.error(res, err.message);
  }
});

export default router;
