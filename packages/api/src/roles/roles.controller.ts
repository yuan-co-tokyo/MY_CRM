import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RolesService } from "./roles.service";

const createRoleSchema = z.object({
  name: z.string().min(1),
  permissionCodes: z.array(z.string()).optional().default([])
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  permissionCodes: z.array(z.string()).optional()
});

@Controller("roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions("role.read")
  async list(@Req() req: AuthenticatedRequest) {
    return this.rolesService.list(req.user);
  }

  @Post()
  @RequirePermissions("role.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createRoleSchema)) body: z.infer<typeof createRoleSchema>
  ) {
    return this.rolesService.create(req.user, body);
  }

  @Get(":id")
  @RequirePermissions("role.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.rolesService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("role.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: z.infer<typeof updateRoleSchema>
  ) {
    return this.rolesService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("role.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.rolesService.remove(req.user, id);
    return { status: "ok" };
  }
}
