import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth';
import * as storageController from '../controllers/storageController';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname || '.webm'));
  }
});

const upload = multer({ storage: storage });

router.post('/upload', authenticate, upload.single('file'), storageController.uploadFile);
router.post('/alert-chunk', authenticate, upload.single('file'), storageController.uploadVideoChunk);
router.get('/evidence/:alertId', authenticate, storageController.getAlertEvidence);

export default router;
