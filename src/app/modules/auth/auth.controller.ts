import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUserFromDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await AuthServices.forgotPassword(email);
  
  sendResponse(res, {
    statusCode: 200,
    success : true,
    message: result.message,
    data : null
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await AuthServices.resetPassword(email, otp, newPassword);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null
  });
})
export const AuthController = {
  loginUser,
  forgotPassword,
  resetPassword

};
