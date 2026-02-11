import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { RolesService } from "./roles.service";

@Controller("permissions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions("permission.read")
  async list(@Req() req: AuthenticatedRequest) {
    return this.rolesService.listPermissions(req.user);
  }
}
