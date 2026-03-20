import { Module } from "@nestjs/common";
import { ContractsListController, ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";

@Module({
  controllers: [ContractsListController, ContractsController],
  providers: [ContractsService]
})
export class ContractsModule {}
