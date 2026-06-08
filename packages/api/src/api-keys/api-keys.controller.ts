import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ApiKeysService } from "./api-keys.service";
import type { CreateApiKeyDto } from "./dto/create-api-key.dto";

@Controller("api-keys")
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async generate(@Request() req: AuthenticatedRequest, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.generate(req.user, dto);
  }

  @Get()
  async list(@Request() req: AuthenticatedRequest) {
    return this.apiKeysService.list(req.user);
  }

  @Patch(":id/revoke")
  async revoke(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.apiKeysService.revoke(req.user, id);
  }
}
