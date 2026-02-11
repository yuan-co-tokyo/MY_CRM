import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { UsersService } from "./users.service";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  userType: z.enum(["ADMIN", "STANDARD", "PRIVILEGED"]).optional(),
  roleIds: z.array(z.string()).optional().default([])
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  userType: z.enum(["ADMIN", "STANDARD", "PRIVILEGED"]).optional(),
  roleIds: z.array(z.string()).optional()
});

const listQuerySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  userType: z.enum(["ADMIN", "STANDARD", "PRIVILEGED"]).optional()
});

@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions("user.read")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>
  ) {
    return this.usersService.list(req.user, query);
  }

  @Post()
  @RequirePermissions("user.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createUserSchema)) body: z.infer<typeof createUserSchema>
  ) {
    return this.usersService.create(req.user, body);
  }

  @Get(":id")
  @RequirePermissions("user.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.usersService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("user.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: z.infer<typeof updateUserSchema>
  ) {
    return this.usersService.update(req.user, id, body);
  }
}
