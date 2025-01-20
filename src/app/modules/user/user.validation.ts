import z from "zod";

const registerUser = z.object({
  body: z.object({
    firstName: z.string({
      required_error: "First name is required!",
    }),
    lastName: z.string({
      required_error: "Last name is required!",
    }),
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

const updateProfileSchema = z.object({
  body: z.object({
    age: z
      .number()
      .int({
        message: "Age must be an integer!",
      })
      .optional(),
    bio: z
      .string({
        required_error: "Bio is required!",
      })
      .optional(),
    lastDonationDate: z
      .string({
        required_error: "Last donation date is required!",
      })
      .optional(),
  }),
});

export const UserValidations = { registerUser, updateProfileSchema };
