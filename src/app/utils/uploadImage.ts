import AWS from 'aws-sdk';
import { v4 as uuidv4 } from "uuid";
import config from '../../config';

// Initialize the S3 client for DigitalOcean Spaces
const s3 = new AWS.S3({
  endpoint: config.digitalOcean.endpoint,
  accessKeyId: config.digitalOcean.accessKeyId,
  secretAccessKey: config.digitalOcean.secretAccessKey,
});

interface UploadImageResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadImage = (file: Express.Multer.File): Promise<UploadImageResponse> => {
  return new Promise((resolve) => {
    try {
      if (!file) {
        return resolve({ success: false, error: "No file provided" });
      }

      // Generate unique filename
      const fileExtension = file.originalname.split(".").pop();
      const fileName = `images/${uuidv4()}.${fileExtension}`;

      // Define the upload parameters
      const params: AWS.S3.PutObjectRequest = {
        Bucket: config.digitalOcean.bucket as string,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      // Upload the file to the Space
      s3.upload(params, (err, data) => {
        if (err) {
          console.error("Error uploading image:", err);
          return resolve({
            success: false,
            error: `DigitalOcean Spaces upload failed: ${err.message}`,
          });
        }

        return resolve({
          success: true,
          url: data.Location,
        });
      });
    } catch (error) {
      console.error("Unexpected error in uploadImage:", error);
      return resolve({
        success: false,
        error: "Failed to upload image",
      });
    }
  });
};
