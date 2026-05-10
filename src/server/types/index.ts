import { Socket } from "socket.io";

export interface UserPayload {
  id: string;
  role: "CITIZEN" | "TANOD" | "ADMIN" | "CAPTAIN";
  barangayId?: string;
  name?: string;
  phone?: string;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user: UserPayload;
  };
}

export interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export interface Incident {
  id: string;
  reporterId: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  status: "PENDING" | "DISPATCHED" | "RESPONDING" | "RESOLVED" | "CANCELLED";
  aiAnalysis?: any;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "CITIZEN" | "TANOD" | "ADMIN" | "CAPTAIN"; // Add more as needed