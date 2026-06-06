import { FunctionDeclaration, Type } from "@google/genai";
import { incidentService } from "./incidentService";
import { notificationService } from "./notificationService";
import { pool } from "../db/index";
import { v4 as uuidv4 } from "uuid";

export const DISPATCHER_TOOLS: FunctionDeclaration[] = [
  {
    name: "get_active_sos",
    description: "Returns a list of all current active and pending emergencies with their locations and severity.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "find_nearest_tanod",
    description: "Finds the nearest active Tanod responders for a given latitude and longitude.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        lat: { type: Type.NUMBER, description: "Latitude of the incident" },
        lng: { type: Type.NUMBER, description: "Longitude of the incident" },
        limit: { type: Type.INTEGER, description: "Maximum number of responders to return (default 3)" },
      },
      required: ["lat", "lng"],
    },
  },
  {
    name: "update_sos_status",
    description: "Updates the status of an SOS alert, assigns a Tanod, and adds notes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sos_id: { type: Type.STRING, description: "The ID of the SOS alert" },
        status: { type: Type.STRING, description: "The new status (PENDING, RESPONDING, RESOLVED, CANCELLED)" },
        assigned_to: { type: Type.STRING, description: "The ID of the Tanod responder assigned" },
        notes: { type: Type.STRING, description: "Tactical notes or updates" },
      },
      required: ["sos_id", "status"],
    },
  },
  {
    name: "create_incident_report",
    description: "Generates a detailed incident report summary for a specific SOS alert.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sos_id: { type: Type.STRING, description: "The ID of the SOS alert to report on" },
      },
      required: ["sos_id"],
    },
  },
  {
    name: "get_tanod_list",
    description: "Returns a list of all active Tanod units currently on patrol.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        only_available: { type: Type.BOOLEAN, description: "If true, only returns tanods not currently responding to an alert" },
      },
    },
  },
  {
    name: "send_push_notification",
    description: "Sends an urgent push notification to a specific Tanod device.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        token: { type: Type.STRING, description: "The FCM device token" },
        title: { type: Type.STRING, description: "Notification title" },
        body: { type: Type.STRING, description: "Notification message body" },
      },
      required: ["token", "title", "body"],
    },
  },
  {
    name: "broadcast_to_responders",
    description: "Broadcasts an emergency alert to all patrolling Tanod units.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Alert title" },
        body: { type: Type.STRING, description: "Alert message body" },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "generate_formal_report",
    description: "Generates a professional, formal incident report in Tagalog/English mix.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sos_id: { type: Type.STRING, description: "The ID of the SOS alert" },
      },
      required: ["sos_id"],
    },
  },
  {
    name: "schedule_patrol",
    description: "Schedules a Tanod unit for a patrol shift in a specific area.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tanod_id: { type: Type.STRING, description: "The ID of the Tanod responder" },
        area: { type: Type.STRING, description: "The area/purok name to patrol" },
        duration_hours: { type: Type.NUMBER, description: "Duration of the shift" },
      },
      required: ["tanod_id", "area"],
    },
  },
];

export const toolHandlers: Record<string, Function> = {
  get_active_sos: async () => {
    return await incidentService.getActiveAlerts();
  },
  find_nearest_tanod: async (args: { lat: number; lng: number; limit?: number }) => {
    return await incidentService.findNearestResponders('default', args.lat, args.lng, args.limit || 3);
  },
  update_sos_status: async (args: { sos_id: string; status: string; assigned_to?: string; notes?: string }) => {
    return await incidentService.updateSOSStatus(args.sos_id, args.status, args.notes, args.assigned_to);
  },
  create_incident_report: async (args: { sos_id: string }) => {
    return await incidentService.createIncidentReport(args.sos_id);
  },
  get_tanod_list: async (args: { only_available?: boolean }) => {
    return await incidentService.getTanodList(args.only_available ?? true);
  },
  send_push_notification: async (args: { token: string; title: string; body: string }) => {
    return await notificationService.sendToDevice(args.token, args.title, args.body);
  },
  broadcast_to_responders: async (args: { title: string; body: string }) => {
    return await notificationService.broadcastToResponders(args.title, args.body);
  },
  generate_formal_report: async (args: { sos_id: string }) => {
    return await incidentService.createIncidentReport(args.sos_id);
  },
  // FIX LOW-05: was a console.log stub that never persisted anything.
  // Now validates the Tanod, inserts a patrol_sessions row, and upserts
  // the patrols row so the voice response contains real DB-backed data.
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

    // 1. Validate: Tanod user must exist and have the right role
    const userCheck = await pool.query(
      `SELECT id, name, role FROM users WHERE id = $1`,
      [tanod_id]
    );

    if (userCheck.rows.length === 0) {
      return {
        status: "error",
        message: `Tanod ${tanod_id} not found in the system.`,
      };
    }

    const tanodUser = userCheck.rows[0];

    if (!["tanod", "admin", "super_admin"].includes(tanodUser.role)) {
      return {
        status: "error",
        message: `User ${tanodUser.name} does not have a Tanod role and cannot be scheduled for patrol.`,
      };
    }

    // 2. Insert a patrol_sessions row
    const sessionId = uuidv4();
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration_hours * 3_600_000);

    await pool.query(
      `INSERT INTO patrol_sessions (id, tanod_id, tanod_name, start_time, end_time, route)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        sessionId,
        tanod_id,
        tanodUser.name,
        startTime,
        endTime,
        JSON.stringify([]), // empty route — populated as the patrol progresses
      ]
    );

    // 3. Mark the Tanod as active in the patrols table (upsert)
    await pool.query(
      `INSERT INTO patrols (tanod_id, tanod_name, is_active, status, last_ping)
       VALUES ($1, $2, true, $3, now())
       ON CONFLICT (tanod_id) DO UPDATE
         SET is_active  = true,
             status     = EXCLUDED.status,
             last_ping  = now()`,
      [tanod_id, tanodUser.name, `On Patrol — ${area}`]
    );

    console.log(
      `[Patrol] Session ${sessionId}: ${tanodUser.name} → ${area} ` +
        `(${duration_hours}h, ends ${endTime.toISOString()})`
    );

    return {
      status: "success",
      message: `${tanodUser.name} has been assigned to patrol ${area} for ${duration_hours} hour(s).`,
      session_id: sessionId,
      tanod_name: tanodUser.name,
      scheduled_end: endTime.toISOString(),
    };
  },
};
