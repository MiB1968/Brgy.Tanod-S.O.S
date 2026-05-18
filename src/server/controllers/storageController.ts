import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';
import * as response from '../utils/response';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadFile = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return response.error(res, "No file uploaded", "BAD_REQUEST", 400);
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  
  return response.success(res, {
    url: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
};

export const uploadVideoChunk = async (req: AuthRequest, res: Response) => {
  const { alertId, index } = req.body;
  
  if (!req.file || !alertId) {
    return response.error(res, "Missing file or alertId", "BAD_REQUEST", 400);
  }

  // Tactical logic: In a real world app, we might want to append these chunks or store them separately.
  // For this SOS app, we'll store them in a subfolder for that alert.
  const alertDir = path.join(UPLOAD_DIR, 'alerts', alertId);
  if (!fs.existsSync(alertDir)) {
    fs.mkdirSync(alertDir, { recursive: true });
  }

  const chunkPath = path.join(alertDir, `chunk_${index}_${Date.now()}.webm`);
  fs.renameSync(req.file.path, chunkPath);

  return response.success(res, {
    success: true,
    message: "Chunk recorded"
  });
};

export const getAlertEvidence = async (req: AuthRequest, res: Response) => {
  const { alertId } = req.params;
  const alertDir = path.join(UPLOAD_DIR, 'alerts', alertId);
  
  if (!fs.existsSync(alertDir)) {
    return response.success(res, []);
  }

  const files = fs.readdirSync(alertDir)
    .filter(f => f.endsWith('.webm'))
    .sort()
    .map(f => `/uploads/alerts/${alertId}/${f}`);

  return response.success(res, files);
};
