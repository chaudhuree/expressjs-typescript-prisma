import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import config from '../../config';

// Initialize the S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: config.digitalOcean.endpoint,
  region: "nyc3", // DigitalOcean Spaces uses nyc3 as region
  credentials: {
    accessKeyId: config.digitalOcean.accessKeyId!,
    secretAccessKey: config.digitalOcean.secretAccessKey!,
  },
});

interface UploadFileResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadFile = async (file: Express.Multer.File): Promise<UploadFileResponse> => {
  try {
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Generate unique filename
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `files/${uuidv4()}.${fileExtension}`;

    // Define the upload parameters
    const uploadParams: PutObjectCommandInput = {
      Bucket: config.digitalOcean.bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    // Upload the file to the Space
    const command = new PutObjectCommand(uploadParams);
    
    try {
      await s3Client.send(command);

      // Generate public URL
      const imageUrl = `${config.digitalOcean.endpoint}/${config.digitalOcean.bucket}/${fileName}`;

      return {
        success: true,
        url: imageUrl,
      };
    } catch (uploadError) {
      console.error("Error uploading image:", uploadError);
      return {
        success: false,
        error: `DigitalOcean Spaces upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    console.error("Unexpected error in uploadImage:", error);
    return {
      success: false,
      error: "Failed to upload image",
    };
  }
};
