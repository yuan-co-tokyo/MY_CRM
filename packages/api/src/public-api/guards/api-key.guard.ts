import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { ApiKeysService } from "../../api-keys/api-keys.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers["x-api-key"] as string | undefined;
    if (!rawKey) throw new UnauthorizedException("API key required");
    const result = await this.apiKeysService.validateKey(rawKey);
    if (!result) throw new UnauthorizedException("Invalid or expired API key");
    (request as any).apiKeyContext = result;
    return true;
  }
}
