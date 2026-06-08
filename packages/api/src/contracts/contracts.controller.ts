import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ContractsService } from "./contracts.service";

const INSURANCE_CATEGORIES = ["LIFE", "AUTO", "FIRE", "ACCIDENT", "SPECIALTY", "MARINE"] as const;

const createContractSchema = z.object({
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

const updateContractSchema = createContractSchema.partial();

const renewalsQuerySchema = z.object({
  withinDays: z.coerce.number().int().min(0).default(30)
});

@Controller("contracts")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractsListController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @RequirePermissions("contract.read")
  async listAll(@Req() req: AuthenticatedRequest) {
    return this.contractsService.listAll(req.user);
  }

  @Get("renewals")
  @RequirePermissions("contract.read")
  async findRenewals(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(renewalsQuerySchema)) query: z.infer<typeof renewalsQuerySchema>
  ) {
    return this.contractsService.findRenewals(req.user, query.withinDays);
  }

  @Post(":id/start-renewal")
  @RequirePermissions("application.create")
  async startRenewal(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.contractsService.startRenewal(req.user, id);
  }

  @Get(":id")
  @RequirePermissions("contract.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.contractsService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("contract.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateContractSchema)) body: z.infer<typeof updateContractSchema>
  ) {
    return this.contractsService.update(req.user, id, body);
  }
}

@Controller("customers/:customerId/contracts")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @RequirePermissions("contract.read")
  async list(@Req() req: AuthenticatedRequest, @Param("customerId") customerId: string) {
    return this.contractsService.listByCustomer(req.user, customerId);
  }

  @Post()
  @RequirePermissions("contract.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Param("customerId") customerId: string,
    @Body(new ZodValidationPipe(createContractSchema)) body: z.infer<typeof createContractSchema>
  ) {
    return this.contractsService.create(req.user, customerId, body);
  }

  @Get(":id")
  @RequirePermissions("contract.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.contractsService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("contract.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateContractSchema)) body: z.infer<typeof updateContractSchema>
  ) {
    return this.contractsService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("contract.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.contractsService.remove(req.user, id);
    return { status: "ok" };
  }
}
