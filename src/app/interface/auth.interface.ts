import { JwtPayload } from "jsonwebtoken";

export interface ITokenUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface IDecodedUser extends JwtPayload, ITokenUser {}
