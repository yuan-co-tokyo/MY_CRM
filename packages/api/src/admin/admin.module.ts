import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminTenantsController } from "./admin-tenants.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminService } from "./admin.service";
import { SuperAdminGuard } from "./super-admin.guard";

@Module({
  imports: [PrismaModule],
  controllers: [AdminTenantsController, AdminUsersController],
  providers: [AdminService, SuperAdminGuard]
})
export class AdminModule {}
