import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { ApiKeyGuard } from "../guards/api-key.guard";
import { PublicCustomersService } from "./public-customers.service";
import { PublicCreateCustomerDto } from "./dto/public-create-customer.dto";
import { PublicUpdateCustomerDto } from "./dto/public-update-customer.dto";

@Controller("api/v1/customers")
@UseGuards(ApiKeyGuard)
export class PublicCustomersController {
  constructor(private readonly publicCustomersService: PublicCustomersService) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const ctx = (req as any).apiKeyContext as { tenantId: string };
    const { data, total } = await this.publicCustomersService.list(
      ctx.tenantId,
      Number(page),
      Number(limit),
    );
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  @Get(":id")
  async get(@Req() req: Request, @Param("id") id: string) {
    const ctx = (req as any).apiKeyContext as { tenantId: string };
    return this.publicCustomersService.get(ctx.tenantId, id);
  }

  @Post()
  @HttpCode(201)
  async create(@Req() req: Request, @Body() dto: PublicCreateCustomerDto) {
    const ctx = (req as any).apiKeyContext as { tenantId: string };
    return this.publicCustomersService.create(ctx.tenantId, dto);
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: PublicUpdateCustomerDto,
  ) {
    const ctx = (req as any).apiKeyContext as { tenantId: string };
    return this.publicCustomersService.update(ctx.tenantId, id, dto);
  }
}
