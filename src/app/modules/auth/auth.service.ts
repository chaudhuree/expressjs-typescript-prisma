import * as bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { generateToken } from '../../utils/generateToken';
import prisma from '../../utils/prisma';
import { emailService,switchToGmailProvider } from '../../utils/email.util';

const loginUserFromDB = async (payload: {
  email: string;
  password: string;
}) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      role: true,
    }
  });
  const isCorrectPassword: Boolean = await bcrypt.compare(
    payload.password,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  const accessToken = await generateToken(
    {
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as string,
  );
  return {
    id: userData.id,
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    role: userData.role,
    accessToken: accessToken,
  };
};

const forgotPassword = async (email: string): Promise<{ message: string }> => {
  // Check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in database
  await prisma.user.update({
    where: { email },
    data: { otp }
  });

  // Switch to Gmail provider
  /**
   * to change from mailtrap to gmail
   * add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env
   * and uncomment the below code
   */
  
  //switchToGmailProvider();

  // Send OTP via email
  await emailService.sendPasswordResetOTP(email, otp);

  return { 
    message: 'Password reset OTP sent successfully. Please check your email.' 
  };
};

const resetPassword = async (email: string, otp: string, newPassword: string): Promise<{ message: string }> => {
  // Find user by email and OTP
  const user = await prisma.user.findFirst({ 
    where: { 
      email,
      otp 
    } 
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP or email');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and clear OTP
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      password: hashedPassword,
      otp: null  // Clear OTP after successful reset
    }
  });

  return { 
    message: 'Password reset successfully' 
  };
};

export const AuthServices = {
  loginUserFromDB,
  forgotPassword,
  resetPassword
};