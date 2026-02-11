import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { CustomersModule } from "./customers/customers.module";
import { InteractionsModule } from "./interactions/interactions.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [PrismaModule, AuthModule, CustomersModule, InteractionsModule, UsersModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
