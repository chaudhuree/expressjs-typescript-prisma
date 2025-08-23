import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../errors/AppError';
import prisma from '../utils/prisma';
import { verifyToken } from '../utils/verifyToken';

const auth = (...roles: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      let token = (req.headers.authorization as string | undefined) || req.cookies?.accessToken;

      if (!token) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }

      // Support 'Bearer <token>' format
      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.slice('Bearer '.length).trim();
      }

      const verifyUserToken = verifyToken(
        token as string,
        config.jwt.access_secret as Secret,
      );

      // Check user is exist
      const user = await prisma.user.findUniqueOrThrow({
        where: {
          id: verifyUserToken.id,
        },
      });

      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }

      req.user = verifyUserToken;
      if (roles.length && !roles.includes(verifyUserToken.role)) {
        throw new AppError(httpStatus.FORBIDDEN, 'Forbidden!');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
