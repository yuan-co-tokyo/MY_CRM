import { Module } from "@nestjs/common";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { PermissionsController } from "./permissions.controller";

@Module({
  controllers: [RolesController, PermissionsController],
  providers: [RolesService]
})
export class RolesModule {}
