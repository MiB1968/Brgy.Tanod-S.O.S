import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { incidentService } from '../services/incidentService';
import { AppError } from '../middleware/error';

export const createSOS = async (req: AuthRequest, res: Response) => {
  const { 
    description, 
    latitude, 
    longitude, 
    initialType, 
    photos, 
    voiceClip, 
    type, 
    location, 
    severity,
    clientUuid // Added for deduplication
  } = req.body;
  const user = req.user!;

  const lat = latitude ?? location?.lat;
  const lng = longitude ?? location?.lng;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new AppError("Valid latitude and longitude are required", 400, "BAD_REQUEST");
  }

  try {
    const incident = await incidentService.createSOS({
      reporterId: user.id,
      barangayId: user.barangayId || 'default',
      description: description?.trim() || '',
      latitude: lat,
      longitude: lng,
      initialType: initialType || type,
      photos,
      voiceClip,
      clientUuid,
      isOfflineRecovered: req.body.isOfflineRecovered
    });

    return res.status(201).json({
      success: true,
      data: incident,
      message: "SOS alert successfully created"
    });
  } catch (error: any) {
    if (error instanceof AppError && error.status < 500) {
      // Expected client error, don't spam console
    } else {
      console.error("[SOS Controller] Create failed:", error);
    }
    throw error; // Let global error handler manage it
  }
};

export const cancelSOS = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const updatedIncident = await incidentService.cancelSOS(id, user.id, user.role);

  return res.json({
    success: true,
    data: updatedIncident,
    message: "SOS alert cancelled"
  });
};

export const getActiveAlerts = async (req: AuthRequest, res: Response) => {
  const activeAlerts = await incidentService.getActiveAlerts();

  return res.json({
    success: true,
    data: activeAlerts,
    message: "Active alerts retrieved successfully"
  });
};

export const findNearest = async (req: AuthRequest, res: Response) => {
  const { lat, lng } = req.body ?? {};

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new AppError("lat and lng must be numbers", 400, "BAD_REQUEST");
  }

  const nearestData = await incidentService.findNearest(lat, lng);

  return res.json({
    success: true,
    data: nearestData,
    message: "Nearest tanod retrieved successfully"
  });
};

export const updateSOS = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes, assignedTo } = req.body;
  const user = req.user!;

  const updated = await incidentService.updateSOSStatus(id, status, notes, assignedTo, user.id);

  return res.json({
    success: true,
    data: updated,
    message: "SOS alert updated"
  });
};

