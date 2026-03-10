import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { CustomersModule } from "./customers/customers.module";
import { InteractionsModule } from "./interactions/interactions.module";
import { UsersModule } from "./users/users.module";
import { GroupsModule } from "./groups/groups.module";
import { RolesModule } from "./roles/roles.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AdminModule } from "./admin/admin.module";
import { HouseholdsModule } from "./households/households.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CustomersModule,
    InteractionsModule,
    UsersModule,
    GroupsModule,
    RolesModule,
    DashboardModule,
    AdminModule,
    HouseholdsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
