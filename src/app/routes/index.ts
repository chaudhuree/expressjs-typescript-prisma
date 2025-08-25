import express, { Router, Request, Response } from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRouters } from '../modules/user/user.routes';
import { ChatRoutes } from '../modules/chat/chat.routes';
import { LogRoutes } from '../modules/log/log.routes';
import { clearLogs } from '../modules/log/log.service';
// need to import below two to upload image -> upload is the middleware
// uploadImage is the function
import { uploadFile } from '../utils/uploadFile';
import { upload } from '../middlewares/upload';

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
  {
    path: '/chat',
    route: ChatRoutes,
  }
  ,
  {
    path: '/logs',
    route: LogRoutes,
  }
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

// ROUTER TO UPLOAD IMAGE
/**
 * @method POST
 * @route {baseUrl}/upload
 * @select form-data in postman
 * @set key "image" and select image from your device
 */
router.post("/upload", upload.single("image"), (req: Request, res: Response) => {
  if (req.file) {
    const result = uploadFile(req.file);
    result.then((response) => {
      if (response.success) {
        return res.status(200).json(response);
      } else {
        return res.status(400).json(response);
      }
    });
  } else {
    return res.status(400).json({ success: false, error: "No file provided" });
  }
});



export default router;
