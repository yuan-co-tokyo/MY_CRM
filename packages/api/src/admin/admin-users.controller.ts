import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SuperAdminGuard } from "./super-admin.guard";
import { AdminService } from "./admin.service";

const createUserSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  userType: z.enum(["ADMIN", "STANDARD", "PRIVILEGED"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional()
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  userType: z.enum(["ADMIN", "STANDARD", "PRIVILEGED"]).optional()
});

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listUsers(@Query("tenantId") tenantId?: string) {
    return this.adminService.listUsers(tenantId);
  }

  @Post()
  createUser(
    @Body(new ZodValidationPipe(createUserSchema)) body: z.infer<typeof createUserSchema>
  ) {
    return this.adminService.createUser(body);
  }

  @Patch(":id")
  updateUser(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: z.infer<typeof updateUserSchema>
  ) {
    return this.adminService.updateUser(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteUser(@Param("id") id: string) {
    await this.adminService.deleteUser(id);
  }
}
