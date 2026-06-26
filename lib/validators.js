import { z } from "zod";

export const usernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(20, "Username must be at most 20 characters long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
});

export const daySchema = z
  .object({
    isAvailable: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isAvailable) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: "End time must be more than start time",
      path: ["endTime"],
    }
  );

export const availabilitySchema = z.object({
  monday: daySchema,
  tuesday: daySchema,
  wednesday: daySchema,
  thursday: daySchema,
  friday: daySchema,
  saturday: daySchema,
  sunday: daySchema,
  timeGap: z.number().min(0, "Time gap must be 0 or more minutes").int(),
});

export const eventSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  duration: z.number().int().positive("Duration must be a positive number"),

  isPrivate: z.boolean(),
});

export const bookingSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  additionalInfo: z
    .string()
    .max(2000, "Additional info must be 2000 characters or less")
    .optional(),
});

export const bookingFormSchema = bookingSchema.pick({
  name: true,
  email: true,
  additionalInfo: true,
});

export const createBookingSchema = bookingSchema;

export const uploadRecordingSchema = z.object({
  fileUrl: z.string().url("Invalid file URL"),
  bookingId: z.string().optional(),
});

export const summaryResponseSchema = z.object({
  summary: z.string(),
  actionItems: z.array(z.string()),
  keyPoints: z.array(z.string()),
  followUps: z.array(z.string()).optional(),
});
