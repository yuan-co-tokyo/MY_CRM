import { Module } from "@nestjs/common";
import { ApplicationsController, ApplicationsListController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  controllers: [ApplicationsListController, ApplicationsController],
  providers: [ApplicationsService]
})
export class ApplicationsModule {}
