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
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CustomersService } from "./customers.service";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1).optional().nullable(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  ownerUserId: z.string().optional().nullable(),
  assigneeUserIds: z.array(z.string()).optional().default([])
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1).optional().nullable(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  ownerUserId: z.string().optional().nullable(),
  assigneeUserIds: z.array(z.string()).optional()
});

const listQuerySchema = z.object({
  ownerUserId: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional()
});

@Controller("customers")
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>
  ) {
    return this.customersService.list(req.user, query);
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createCustomerSchema)) body: z.infer<typeof createCustomerSchema>
  ) {
    return this.customersService.create(req.user, body);
  }

  @Get(":id")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.customersService.get(req.user, id);
  }

  @Patch(":id")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: z.infer<typeof updateCustomerSchema>
  ) {
    return this.customersService.update(req.user, id, body);
  }

  @Delete(":id")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.customersService.remove(req.user, id);
    return { status: "ok" };
  }
}
