import z from "zod";

const loginUser = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "Email is required!",
      })
      .email({
        message: "Invalid email format!",
      }),
    password: z.string({
      required_error: "Password is required!",
    }),
  }),
});

const forgotPasswordValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email address')
  })
});

const resetPasswordValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long')
  })
});

export const authValidation = { loginUser, forgotPasswordValidation, resetPasswordValidation };

