import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Configure multer for memory storage
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
      cb(null, true);
    }
  });