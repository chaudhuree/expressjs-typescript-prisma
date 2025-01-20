import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { authValidation } from './auth.validation';

const router = express.Router();

router.post(
  '/login', 
  validateRequest(authValidation.loginUser), 
  AuthController.loginUser
);

router.post(
  '/forgot-password', 
  validateRequest(authValidation.forgotPasswordValidation), 
  AuthController.forgotPassword
);

router.post(
  '/reset-password', 
  validateRequest(authValidation.resetPasswordValidation), 
  AuthController.resetPassword
);

export const AuthRoutes = router;
