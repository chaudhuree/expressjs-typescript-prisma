export type ILoginUser = {
  email: string;
  password: string;
};

export type IRegisterUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type IChangePassword = {
  oldPassword: string;
  newPassword: string;
};

export type IForgotPassword = {
  email: string;
};

export type IResetPassword = {
  email: string;
  otp: string;
  newPassword: string;
};

export type IUpdateProfile = {
  firstName?: string;
  lastName?: string;
  bio?: string;
  age?: number;
};
