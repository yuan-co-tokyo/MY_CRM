import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { TasksService } from "./tasks.service";
import { createTaskSchema, updateTaskSchema, listTaskQuerySchema } from "./tasks.dto";

@Controller("tasks")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions("task.read")
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listTaskQuerySchema)) query: z.infer<typeof listTaskQuerySchema>
  ) {
    return this.tasksService.findAll(req.user, query);
  }

  @Post()
  @RequirePermissions("task.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createTaskSchema)) body: z.infer<typeof createTaskSchema>
  ) {
    return this.tasksService.create(req.user, body);
  }

  @Patch(":id/complete")
  @RequirePermissions("task.update")
  async complete(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Query("reopen") reopen?: string
  ) {
    return this.tasksService.complete(req.user, id, reopen === "true");
  }

  @Get(":id")
  @RequirePermissions("task.read")
  async findOne(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.tasksService.findOne(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("task.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: z.infer<typeof updateTaskSchema>
  ) {
    return this.tasksService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("task.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.tasksService.remove(req.user, id);
    return { status: "ok" };
  }
}
