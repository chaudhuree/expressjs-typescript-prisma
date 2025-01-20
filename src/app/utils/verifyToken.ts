import jwt, { Secret } from "jsonwebtoken";
import { IDecodedUser } from "../interface/auth.interface";

export const verifyToken = (token: string, secret: Secret) => {
  return jwt.verify(token, secret) as IDecodedUser;
};
