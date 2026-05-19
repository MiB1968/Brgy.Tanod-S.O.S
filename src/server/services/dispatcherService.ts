import { FunctionDeclaration, Type } from "@google/genai";
import { incidentService } from "./incidentService";
import { notificationService } from "./notificationService";

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
  schedule_patrol: async (args: { tanod_id: string; area: string; duration_hours?: number }) => {
    // In a real database, we'd insert into a 'patrol_schedule' table
    // For now, we simulate success and log it
    console.log(`[Patrol] Scheduled Tanod ${args.tanod_id} for ${args.area} (${args.duration_hours || 4}h)`);
    return { status: "success", message: `Tanod assigned to patrol ${args.area}` };
  },
};
