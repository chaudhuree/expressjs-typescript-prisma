import express, { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthServices } from '../modules/auth/auth.service';
import { UserServices } from '../modules/user/user.service';
import catchAsync from '../utils/catchAsync';
import { verifyToken } from '../utils/verifyToken';

const router = express.Router();

// Home page
router.get('/', (req: Request, res: Response) => {
  const token = req.cookies?.accessToken;
  let user = null;
  
  if (token) {
    try {
      const decoded = verifyToken(token);
      user = decoded;
    } catch (error) {
      // Invalid token, just continue without user
    }
  }
  
  res.render('home', { 
    title: 'Home - Auth System',
    user
  });
});

// Chat testing page
router.get('/chat', (req: Request, res: Response) => {
  const token = req.cookies?.accessToken;
  let user = null;
  if (token) {
    try {
      user = verifyToken(token);
    } catch (e) {
      // ignore
    }
  }
  res.render('chat', {
    title: 'Chat - Realtime',
    user,
  });
});

// Login page
router.get('/auth/login', (req: Request, res: Response) => {
  res.render('login', { 
    title: 'Login - Auth System'
  });
});

// Process login
router.post('/auth/login-process', catchAsync(async (req: Request, res: Response) => {
  try {
    const result = await AuthServices.loginUserFromDB(req.body);
    
    // Set cookie with token
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.redirect('/');
  } catch (error: any) {
    res.render('login', {
      title: 'Login - Auth System',
      error: error.message || 'Login failed'
    });
  }
}));

// Register page
router.get('/auth/register', (req: Request, res: Response) => {
  res.render('register', { 
    title: 'Register - Auth System'
  });
});

// Process registration
router.post('/auth/register-process', catchAsync(async (req: Request, res: Response) => {
  try {
    await UserServices.registerUserIntoDB(req.body);
    res.render('login', {
      title: 'Login - Auth System',
      success: 'Registration successful! Please login.'
    });
  } catch (error: any) {
    res.render('register', {
      title: 'Register - Auth System',
      error: error.message || 'Registration failed'
    });
  }
}));

// Forgot password page
router.get('/auth/forgot-password', (req: Request, res: Response) => {
  res.render('forgot-password', { 
    title: 'Forgot Password - Auth System'
  });
});

// Process forgot password
router.post('/auth/forgot-password-process', catchAsync(async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await AuthServices.forgotPassword(email);
    
    res.render('reset-password', {
      title: 'Reset Password - Auth System',
      success: result.message,
      email
    });
  } catch (error: any) {
    res.render('forgot-password', {
      title: 'Forgot Password - Auth System',
      error: error.message || 'Failed to send reset OTP'
    });
  }
}));

// Reset password page
router.get('/auth/reset-password', (req: Request, res: Response) => {
  res.render('reset-password', { 
    title: 'Reset Password - Auth System'
  });
});

// Process reset password
router.post('/auth/reset-password-process', catchAsync(async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await AuthServices.resetPassword(email, otp, newPassword);
    
    res.render('login', {
      title: 'Login - Auth System',
      success: result.message
    });
  } catch (error: any) {
    res.render('reset-password', {
      title: 'Reset Password - Auth System',
      error: error.message || 'Failed to reset password',
      email: req.body.email
    });
  }
}));

// Logout
router.get('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.redirect('/');
});

export const ViewRoutes = router;
