import { z } from "zod";

export const CreateEventSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    location: z.string().optional(),
    type: z.enum(["MEETING", "CALL", "OTHER"]).optional(),
    customerId: z.string().optional(),
    ownerId: z.string().optional()
  })
  .refine((data) => new Date(data.endAt) >= new Date(data.startAt), {
    message: "endAt must be >= startAt",
    path: ["endAt"]
  });

export const UpdateEventSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    location: z.string().optional(),
    type: z.enum(["MEETING", "CALL", "OTHER"]).optional(),
    customerId: z.string().optional(),
    ownerId: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.startAt && data.endAt && new Date(data.endAt) < new Date(data.startAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endAt must be >= startAt",
        path: ["endAt"]
      });
    }
  });

export type CreateEventDto = z.infer<typeof CreateEventSchema>;
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;
