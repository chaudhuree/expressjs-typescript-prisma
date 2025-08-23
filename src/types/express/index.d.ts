declare global {
  namespace Express {
    interface Request {
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        buffer: Buffer;
        size: number;
      };
      user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      };
    }
  }
}

export {};
