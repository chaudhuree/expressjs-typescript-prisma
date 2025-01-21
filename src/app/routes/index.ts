import express, { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { uploadImage } from '../utils/uploadImage';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRouters } from '../modules/user/user.routes';

const router: Router = express.Router();

interface ModuleRoute {
  path: string;
  route: Router;
}

const moduleRoutes: ModuleRoute[] = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
    cb(null, true);
  }
});

// Image upload route
router.post('/upload-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const result = await uploadImage(req.file);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in upload route:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
