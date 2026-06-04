// PATCH: src/server/services/dispatcherService.ts  (schedule_patrol handler only)
//
// LOW-05 — schedule_patrol was a console.log stub that never persisted anything.
// The Jarvis dispatcher could "confirm" a patrol that was never actually recorded.
//
// Changes:
//   1. Inserts a row into patrol_sessions (already in schema.ts).
//   2. Updates the patrols table to mark the Tanod as active.
//   3. Returns structured data so the voice response can include real details.
//   4. Validates that the Tanod user exists before scheduling.
//
// Import additions needed at top of dispatcherService.ts:
//   import { pool } from '../db/index';
//   import { v4 as uuidv4 } from 'uuid';

  schedule_patrol: async (args: {
    tanod_id: string;
    area: string;
    duration_hours?: number;
  }): Promise<{
    status: string;
    message: string;
    session_id?: string;
    tanod_name?: string;
    scheduled_end?: string;
  }> => {
    const { tanod_id, area, duration_hours = 4 } = args;

    // 1. Validate the Tanod user exists and has the right role
    const userCheck = await pool.query(
      `SELECT id, name, role FROM users WHERE id = $1`,
      [tanod_id]
    );
    if (userCheck.rows.length === 0) {
      return {
        status: 'error',
        message: `Tanod ${tanod_id} not found in the system.`,
      };
    }
    const tanodUser = userCheck.rows[0];
    if (!['tanod', 'admin', 'super_admin'].includes(tanodUser.role)) {
      return {
        status: 'error',
        message: `User ${tanodUser.name} does not have a Tanod role.`,
      };
    }

    // 2. Insert into patrol_sessions
    const sessionId = uuidv4();
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration_hours * 3_600_000);

    await pool.query(
      `INSERT INTO patrol_sessions (id, tanod_id, tanod_name, start_time, end_time, route)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [sessionId, tanod_id, tanodUser.name, startTime, endTime, JSON.stringify([])]
    );

    // 3. Mark the Tanod as active in the patrols table (upsert)
    await pool.query(
      `INSERT INTO patrols (tanod_id, tanod_name, is_active, status, last_ping)
       VALUES ($1, $2, true, $3, now())
       ON CONFLICT (tanod_id) DO UPDATE
         SET is_active = true,
             status    = EXCLUDED.status,
             last_ping = now()`,
      [tanod_id, tanodUser.name, `On Patrol — ${area}`]
    );

    console.log(
      `[Patrol] Session ${sessionId}: ${tanodUser.name} → ${area} ` +
      `(${duration_hours}h, ends ${endTime.toISOString()})`
    );

    return {
      status: 'success',
      message: `${tanodUser.name} has been assigned to patrol ${area} for ${duration_hours} hour(s).`,
      session_id: sessionId,
      tanod_name: tanodUser.name,
      scheduled_end: endTime.toISOString(),
    };
  },
