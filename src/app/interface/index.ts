import { JwtPayload } from "jsonwebtoken";
import { IDecodedUser } from "./auth.interface";

declare global {
  namespace Express {
    interface Request {
      user: IDecodedUser;
    }
  }
}
