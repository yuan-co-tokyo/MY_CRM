import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ApplicationsService } from "./applications.service";

const INSURANCE_CATEGORIES = ["LIFE", "AUTO", "FIRE", "ACCIDENT", "SPECIALTY", "MARINE"] as const;
const APPLICATION_STATUSES = ["DRAFT", "PROPOSED", "SUBMITTED", "APPROVED", "CONVERTED", "REJECTED", "WITHDRAWN"] as const;

const createApplicationSchema = z.object({
  category: z.enum(INSURANCE_CATEGORIES),
  insuranceLineId: z.string().optional().nullable(),
  insuranceTypeId: z.string().optional().nullable(),
  insuranceCompanyId: z.string().optional().nullable(),
  petName: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  applicationDate: z.string().optional().nullable(),
  accountingDate: z.string().optional().nullable()
});

const updateApplicationSchema = createApplicationSchema.partial();
const listApplicationQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional()
});
const updateApplicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES)
});

@Controller("applications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApplicationsListController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @RequirePermissions("application.read")
  async listAll(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listApplicationQuerySchema)) query: z.infer<typeof listApplicationQuerySchema>
  ) {
    return this.applicationsService.listAll(req.user, query);
  }

  @Get(":id")
  @RequirePermissions("application.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.applicationsService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("application.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateApplicationSchema)) body: z.infer<typeof updateApplicationSchema>
  ) {
    return this.applicationsService.update(req.user, id, body);
  }

  @Patch(":id/status")
  @RequirePermissions("application.update")
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateApplicationStatusSchema)) body: z.infer<typeof updateApplicationStatusSchema>
  ) {
    return this.applicationsService.updateStatus(req.user, id, body.status);
  }

  @Post(":id/convert")
  @RequirePermissions("application.update")
  async convert(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.applicationsService.convert(req.user, id);
  }
}

@Controller("customers/:customerId/applications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @RequirePermissions("application.read")
  async list(@Req() req: AuthenticatedRequest, @Param("customerId") customerId: string) {
    return this.applicationsService.listByCustomer(req.user, customerId);
  }

  @Post()
  @RequirePermissions("application.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Param("customerId") customerId: string,
    @Body(new ZodValidationPipe(createApplicationSchema)) body: z.infer<typeof createApplicationSchema>
  ) {
    return this.applicationsService.create(req.user, customerId, body);
  }

  @Get(":id")
  @RequirePermissions("application.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.applicationsService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("application.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateApplicationSchema)) body: z.infer<typeof updateApplicationSchema>
  ) {
    return this.applicationsService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("application.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.applicationsService.remove(req.user, id);
    return { status: "ok" };
  }
}
