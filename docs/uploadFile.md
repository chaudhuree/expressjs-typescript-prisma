In order to upload a file, you need to use the `uploadFile` function provided by the `utils/uploadFile.ts` file. and also `upload` middleware provided by the `middlewares/upload.ts` file

```javascript
import { uploadFile } from "../utils/uploadFile";
import { upload } from "../middlewares/upload";

const router = express.Router();

// ROUTER TO UPLOAD IMAGE
/**
 * @method POST
 * @route {baseUrl}/upload
 * @description This route is used to upload an image
 * @select form-data in postman
 * @param {file} image - The image to be uploaded
 * @set key "image" and select image from your device
 * @returns {object} - The image that was uploaded
 */
router.post("/upload", upload.single("image"), async (req, res) => {
  if (req.file) {
    const image = await uploadFile(req.file.path);
    return res.status(200).json(image);
  }
});
```

```typescript
import express, { Router, Request, Response } from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRouters } from '../modules/user/user.routes';
// need to import below two to upload image -> upload is the middleware
// uploadImage is the function
import { uploadFile } from '../utils/uploadFile';
import { upload } from '../middlewares/upload';

const router: Router = express.Router();



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
```