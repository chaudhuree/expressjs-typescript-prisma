import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import config from "../../config";
import { IDecodedUser } from "../interface/auth.interface";

export const verifyToken = (token: string, secret: Secret = config.jwt.access_secret as Secret) => {
  return jwt.verify(token, secret) as IDecodedUser;
};
