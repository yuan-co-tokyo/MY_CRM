import { Module } from "@nestjs/common";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { PublicCustomersService } from "./customers/public-customers.service";
import { PublicCustomersController } from "./customers/public-customers.controller";

@Module({
  imports: [ApiKeysModule],
  providers: [ApiKeyGuard, PublicCustomersService],
  controllers: [PublicCustomersController],
})
export class PublicApiModule {}
