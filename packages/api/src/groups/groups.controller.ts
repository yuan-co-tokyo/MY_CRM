import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards
} from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { GroupsService } from "./groups.service";

const createGroupSchema = z.object({
  name: z.string().min(1)
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional()
});

const updateMembersSchema = z.object({
  userIds: z.array(z.string()).min(0)
});

const updateRolesSchema = z.object({
  roleIds: z.array(z.string()).min(0)
});

@Controller("groups")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @RequirePermissions("group.read")
  async list(@Req() req: AuthenticatedRequest) {
    return this.groupsService.list(req.user);
  }

  @Post()
  @RequirePermissions("group.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createGroupSchema)) body: z.infer<typeof createGroupSchema>
  ) {
    return this.groupsService.create(req.user, body);
  }

  @Get(":id")
  @RequirePermissions("group.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.groupsService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("group.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateGroupSchema)) body: z.infer<typeof updateGroupSchema>
  ) {
    return this.groupsService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("group.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.groupsService.remove(req.user, id);
    return { status: "ok" };
  }

  @Put(":id/members")
  @RequirePermissions("group.update")
  async setMembers(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMembersSchema)) body: z.infer<typeof updateMembersSchema>
  ) {
    return this.groupsService.setMembers(req.user, id, body.userIds);
  }

  @Put(":id/roles")
  @RequirePermissions("role.update")
  async setRoles(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRolesSchema)) body: z.infer<typeof updateRolesSchema>
  ) {
    return this.groupsService.setRoles(req.user, id, body.roleIds);
  }
}
