import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload, LoginInput } from "./auth.types";

const DEFAULT_REFRESH_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: input.email
      }
    });

    if (user?.deletedAt) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.issueTokens(user.id, user.tenantId, user.email, user.userType);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async refresh(refreshToken: string) {
    const { tokenId, secret } = this.parseRefreshToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true }
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const secretOk = await bcrypt.compare(secret, stored.tokenHash);
    if (!secretOk) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.tenantId,
      stored.user.email,
      stored.user.userType
    );
  }

  async logout(refreshToken: string) {
    const { tokenId } = this.parseRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async getMe(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, deletedAt: null }
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return this.sanitizeUser(user);
  }

  private async issueTokens(userId: string, tenantId: string, email: string, userType: string) {
    const accessToken = this.jwtService.sign({
      sub: userId,
      tenantId,
      email,
      userType
    });

    const { token, expiresAt } = await this.createRefreshToken(userId);

    return {
      accessToken,
      refreshToken: token,
      expiresAt: expiresAt.toISOString()
    };
  }

  private async createRefreshToken(userId: string) {
    const secret = crypto.randomBytes(48).toString("base64url");
    const tokenHash = await bcrypt.hash(secret, 12);
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS || DEFAULT_REFRESH_DAYS);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });

    return {
      token: `${record.id}.${secret}`,
      expiresAt
    };
  }

  private parseRefreshToken(token: string) {
    const [tokenId, secret] = token.split(".");
    if (!tokenId || !secret) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    return { tokenId, secret };
  }

  private sanitizeUser(user: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    status: string;
    userType: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      status: user.status,
      userType: user.userType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
