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
import { CustomersService } from "./customers.service";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1).optional().nullable(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  ownerUserId: z.string().optional().nullable(),
  assigneeUserIds: z.array(z.string()).optional().default([]),
  customerCategory: z.enum(["INDIVIDUAL", "CORPORATE"]).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  mobilePhone: z.string().optional().nullable(),
  workCompany: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  workEmail: z.string().email().optional().nullable(),
  annualIncome: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1).optional().nullable(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  ownerUserId: z.string().optional().nullable(),
  assigneeUserIds: z.array(z.string()).optional(),
  customerCategory: z.enum(["INDIVIDUAL", "CORPORATE"]).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  mobilePhone: z.string().optional().nullable(),
  workCompany: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  workEmail: z.string().email().optional().nullable(),
  annualIncome: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
  ownerUserId: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional()
});

const addEmployeeSchema = z.object({
  individualCustomerId: z.string().min(1),
  jobTitle: z.string().optional().nullable(),
  department: z.string().optional().nullable()
});

const updateEmployeeSchema = z.object({
  jobTitle: z.string().optional().nullable(),
  department: z.string().optional().nullable()
});

const addSubsidiarySchema = z.object({
  subsidiaryCustomerId: z.string().min(1)
});

@Controller("customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions("customer.read")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>
  ) {
    return this.customersService.list(req.user, query);
  }

  @Post()
  @RequirePermissions("customer.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createCustomerSchema)) body: z.infer<typeof createCustomerSchema>
  ) {
    return this.customersService.create(req.user, body);
  }

  @Get(":id")
  @RequirePermissions("customer.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.customersService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("customer.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: z.infer<typeof updateCustomerSchema>
  ) {
    return this.customersService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("customer.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.customersService.remove(req.user, id);
    return { status: "ok" };
  }

  // ── Employees ──────────────────────────────────────────────────────────────

  @Get(":id/employees")
  @RequirePermissions("customer.read")
  async listEmployees(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.customersService.listEmployees(req.user, id);
  }

  @Post(":id/employees")
  @RequirePermissions("customer.update")
  async addEmployee(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addEmployeeSchema)) body: z.infer<typeof addEmployeeSchema>
  ) {
    return this.customersService.addEmployee(req.user, id, body);
  }

  @Patch(":id/employees/:employmentId")
  @RequirePermissions("customer.update")
  async updateEmployee(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("employmentId") employmentId: string,
    @Body(new ZodValidationPipe(updateEmployeeSchema)) body: z.infer<typeof updateEmployeeSchema>
  ) {
    return this.customersService.updateEmployee(req.user, id, employmentId, body);
  }

  @Delete(":id/employees/:employmentId")
  @RequirePermissions("customer.update")
  async removeEmployee(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("employmentId") employmentId: string
  ) {
    await this.customersService.removeEmployee(req.user, id, employmentId);
    return { status: "ok" };
  }

  // ── Subsidiaries ────────────────────────────────────────────────────────────

  @Get(":id/subsidiaries")
  @RequirePermissions("customer.read")
  async listSubsidiaries(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.customersService.listSubsidiaries(req.user, id);
  }

  @Post(":id/subsidiaries")
  @RequirePermissions("customer.update")
  async addSubsidiary(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addSubsidiarySchema)) body: z.infer<typeof addSubsidiarySchema>
  ) {
    return this.customersService.addSubsidiary(req.user, id, body.subsidiaryCustomerId);
  }

  @Delete(":id/subsidiaries/:subsidiaryId")
  @RequirePermissions("customer.update")
  async removeSubsidiary(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("subsidiaryId") subsidiaryId: string
  ) {
    await this.customersService.removeSubsidiary(req.user, id, subsidiaryId);
    return { status: "ok" };
  }
}
