import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: JwtPayload,
    query: { status?: "ACTIVE" | "SUSPENDED"; userType?: "ADMIN" | "STANDARD" | "PRIVILEGED" }
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.userType ? { userType: query.userType } : {})
      },
      orderBy: { createdAt: "desc" },
      include: { userRoles: { select: { roleId: true } } }
    });

    return users.map((item) => this.toResponse(item));
  }

  async get(user: JwtPayload, id: string) {
    const found = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { userRoles: { select: { roleId: true } } }
    });

    if (!found) {
      throw new NotFoundException("User not found");
    }

    return this.toResponse(found);
  }

  async create(
    user: JwtPayload,
    input: {
      email: string;
      password: string;
      name: string;
      status?: "ACTIVE" | "SUSPENDED";
      userType?: "ADMIN" | "STANDARD" | "PRIVILEGED";
      roleIds?: string[];
    }
  ) {
    await this.assertRoleIdsInTenant(user.tenantId, input.roleIds ?? []);

    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      const created = await this.prisma.user.create({
        data: {
          tenantId: user.tenantId,
          email: input.email,
          passwordHash,
          name: input.name,
          status: input.status ?? "ACTIVE",
          userType: input.userType ?? "STANDARD",
          userRoles: {
            create: (input.roleIds ?? []).map((roleId) => ({ roleId }))
          }
        },
        include: { userRoles: { select: { roleId: true } } }
      });

      return this.toResponse(created);
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new BadRequestException("Email already exists");
      }
      throw error;
    }
  }

  async update(
    user: JwtPayload,
    id: string,
    input: {
      email?: string;
      password?: string;
      name?: string;
      status?: "ACTIVE" | "SUSPENDED";
      userType?: "ADMIN" | "STANDARD" | "PRIVILEGED";
      roleIds?: string[];
    }
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { userRoles: { select: { roleId: true } } }
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    if (input.roleIds) {
      await this.assertRoleIdsInTenant(user.tenantId, input.roleIds);
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: existing.id } });
        if (input.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: input.roleIds.map((roleId) => ({ userId: existing.id, roleId })),
            skipDuplicates: true
          });
        }
      }

      return tx.user.update({
        where: { id: existing.id },
        data: {
          email: input.email ?? existing.email,
          passwordHash: passwordHash ?? existing.passwordHash,
          name: input.name ?? existing.name,
          status: input.status ?? existing.status,
          userType: input.userType ?? existing.userType
        },
        include: { userRoles: { select: { roleId: true } } }
      });
    });

    return this.toResponse(updated);
  }

  private async assertRoleIdsInTenant(tenantId: string, roleIds: string[]) {
    if (roleIds.length === 0) {
      return;
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds }, tenantId, deletedAt: null },
      select: { id: true }
    });

    if (roles.length !== new Set(roleIds).size) {
      throw new BadRequestException("Role not found in tenant");
    }
  }

  private toResponse(user: any) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      status: user.status,
      userType: user.userType,
      roleIds: user.userRoles.map((role: { roleId: string }) => role.roleId),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
