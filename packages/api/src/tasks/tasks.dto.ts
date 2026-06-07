import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  customerId: z.string().optional(),
  assigneeId: z.string().optional()
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  customerId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["OPEN", "DONE", "CANCELLED"]).optional()
});

export const listTaskQuerySchema = z.object({
  scope: z.enum(["mine", "all"]).optional(),
  due: z.enum(["today", "overdue"]).optional(),
  status: z.enum(["OPEN", "DONE", "CANCELLED"]).optional(),
  customerId: z.string().optional()
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type ListTaskQuery = z.infer<typeof listTaskQuerySchema>;
