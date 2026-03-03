import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SuperAdminGuard } from "./super-admin.guard";
import { AdminService } from "./admin.service";

const createTenantSchema = z.object({
  name: z.string().min(1)
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional()
});

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller("admin/tenants")
export class AdminTenantsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listTenants() {
    return this.adminService.listTenants();
  }

  @Post()
  createTenant(
    @Body(new ZodValidationPipe(createTenantSchema)) body: z.infer<typeof createTenantSchema>
  ) {
    return this.adminService.createTenant(body.name);
  }

  @Patch(":id")
  updateTenant(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) body: z.infer<typeof updateTenantSchema>
  ) {
    return this.adminService.updateTenant(id, body.name!);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteTenant(@Param("id") id: string) {
    await this.adminService.deleteTenant(id);
  }
}
