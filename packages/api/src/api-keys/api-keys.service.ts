import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";
import type { CreateApiKeyDto } from "./dto/create-api-key.dto";
import type { ApiKeyResponseDto } from "./dto/api-key-response.dto";

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(user: JwtPayload, dto: CreateApiKeyDto) {
    const random = crypto.randomBytes(32).toString("base64url");
    const rawKey = `crm_${random}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        keyHash,
        keyPrefix,
        createdBy: user.sub,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return { ...this.toResponse(apiKey), plainKey: rawKey };
  }

  async list(user: JwtPayload): Promise<ApiKeyResponseDto[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return apiKeys.map((k) => this.toResponse(k));
  }

  async revoke(user: JwtPayload, id: string): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { id, tenantId: user.tenantId, deletedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateKey(rawKey: string): Promise<{ tenantId: string; apiKeyId: string } | null> {
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash, deletedAt: null, revokedAt: null },
    });

    if (!apiKey) return null;

    if (apiKey.expiresAt != null && apiKey.expiresAt < new Date()) return null;

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return { tenantId: apiKey.tenantId, apiKeyId: apiKey.id };
  }

  private toResponse(apiKey: any): ApiKeyResponseDto {
    const now = new Date();
    const isActive =
      apiKey.revokedAt == null &&
      (apiKey.expiresAt == null || apiKey.expiresAt > now);
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdBy: apiKey.createdBy,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      revokedAt: apiKey.revokedAt,
      createdAt: apiKey.createdAt,
      isActive,
    };
  }
}
