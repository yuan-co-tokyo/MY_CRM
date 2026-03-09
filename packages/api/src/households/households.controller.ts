import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { HouseholdsService } from "./households.service";

const createHouseholdSchema = z.object({
  name: z.string().min(1),
  postalCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable()
});

const updateHouseholdSchema = z.object({
  name: z.string().min(1).optional(),
  postalCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable()
});

const addMemberSchema = z.object({
  customerId: z.string().min(1)
});

@Controller("households")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get()
  @RequirePermissions("household.read")
  async list(@Req() req: AuthenticatedRequest) {
    return this.householdsService.list(req.user);
  }

  @Post()
  @RequirePermissions("household.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createHouseholdSchema)) body: z.infer<typeof createHouseholdSchema>
  ) {
    return this.householdsService.create(req.user, body);
  }

  @Get(":id")
  @RequirePermissions("household.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.householdsService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("household.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateHouseholdSchema)) body: z.infer<typeof updateHouseholdSchema>
  ) {
    return this.householdsService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("household.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.householdsService.remove(req.user, id);
    return { status: "ok" };
  }

  @Post(":id/members")
  @RequirePermissions("household.update")
  async addMember(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addMemberSchema)) body: z.infer<typeof addMemberSchema>
  ) {
    return this.householdsService.addMember(req.user, id, body.customerId);
  }

  @Delete(":id/members/:customerId")
  @RequirePermissions("household.update")
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("customerId") customerId: string
  ) {
    return this.householdsService.removeMember(req.user, id, customerId);
  }
}
