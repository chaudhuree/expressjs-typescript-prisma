import jwt, { Secret } from "jsonwebtoken";
import { ITokenUser } from "../interface/auth.interface";

export const generateToken = (
  payload: ITokenUser,
  secret: Secret,
  expiresIn: string
) => {
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: expiresIn,
  });
  return token;
};
