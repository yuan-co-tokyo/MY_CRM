import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { rolePermissions: { include: { permission: true } } }
    });

    return roles.map((role) => this.toResponse(role));
  }

  async get(user: JwtPayload, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { rolePermissions: { include: { permission: true } } }
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return this.toResponse(role);
  }

  async create(
    user: JwtPayload,
    input: {
      name: string;
      permissionCodes?: string[];
    }
  ) {
    const permissions = await this.resolvePermissions(input.permissionCodes ?? []);

    try {
      const created = await this.prisma.role.create({
        data: {
          tenantId: user.tenantId,
          name: input.name,
          rolePermissions: {
            create: permissions.map((permissionId) => ({ permissionId }))
          }
        },
        include: { rolePermissions: { include: { permission: true } } }
      });

      return this.toResponse(created);
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new BadRequestException("Role name already exists");
      }
      throw error;
    }
  }

  async update(
    user: JwtPayload,
    id: string,
    input: {
      name?: string;
      permissionCodes?: string[];
    }
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { rolePermissions: true }
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    const permissionIds = input.permissionCodes
      ? await this.resolvePermissions(input.permissionCodes)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
            skipDuplicates: true
          });
        }
      }

      return tx.role.update({
        where: { id: role.id },
        data: {
          name: input.name ?? role.name
        },
        include: { rolePermissions: { include: { permission: true } } }
      });
    });

    return this.toResponse(updated);
  }

  async remove(user: JwtPayload, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    await this.prisma.role.update({
      where: { id: role.id },
      data: { deletedAt: new Date() }
    });
  }

  private async resolvePermissions(codes: string[]) {
    if (codes.length === 0) {
      return [] as string[];
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true }
    });

    if (permissions.length !== new Set(codes).size) {
      throw new BadRequestException("Permission code not found");
    }

    return permissions.map((permission) => permission.id);
  }

  async listPermissions(user: JwtPayload) {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { code: "asc" }
    });

    return permissions.map((permission) => ({
      id: permission.id,
      code: permission.code,
      description: permission.description
    }));
  }

  private toResponse(role: any) {
    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      permissionCodes: role.rolePermissions.map((item: any) => item.permission.code),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
  }
}
