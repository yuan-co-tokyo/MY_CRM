import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload) {
    const groups = await this.prisma.group.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        userGroups: { select: { userId: true } },
        groupRoles: { select: { roleId: true } }
      }
    });

    return groups.map((group) => this.toResponse(group));
  }

  async get(user: JwtPayload, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        userGroups: { select: { userId: true } },
        groupRoles: { select: { roleId: true } }
      }
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    return this.toResponse(group);
  }

  async create(user: JwtPayload, input: { name: string }) {
    try {
      const created = await this.prisma.group.create({
        data: {
          tenantId: user.tenantId,
          name: input.name
        },
        include: {
          userGroups: { select: { userId: true } },
          groupRoles: { select: { roleId: true } }
        }
      });

      return this.toResponse(created);
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new BadRequestException("Group name already exists");
      }
      throw error;
    }
  }

  async update(user: JwtPayload, id: string, input: { name?: string }) {
    const existing = await this.prisma.group.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException("Group not found");
    }

    const updated = await this.prisma.group.update({
      where: { id: existing.id },
      data: { name: input.name ?? existing.name },
      include: {
        userGroups: { select: { userId: true } },
        groupRoles: { select: { roleId: true } }
      }
    });

    return this.toResponse(updated);
  }

  async remove(user: JwtPayload, id: string) {
    const existing = await this.prisma.group.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException("Group not found");
    }

    await this.prisma.group.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() }
    });
  }

  async setMembers(user: JwtPayload, id: string, userIds: string[]) {
    const group = await this.prisma.group.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    await this.ensureUsersInTenant(user.tenantId, userIds);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userGroup.deleteMany({ where: { groupId: group.id } });
      if (userIds.length > 0) {
        await tx.userGroup.createMany({
          data: userIds.map((userId) => ({ groupId: group.id, userId })),
          skipDuplicates: true
        });
      }

      return tx.group.findUnique({
        where: { id: group.id },
        include: {
          userGroups: { select: { userId: true } },
          groupRoles: { select: { roleId: true } }
        }
      });
    });

    return this.toResponse(updated);
  }

  async setRoles(user: JwtPayload, id: string, roleIds: string[]) {
    const group = await this.prisma.group.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    await this.ensureRolesInTenant(user.tenantId, roleIds);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.groupRole.deleteMany({ where: { groupId: group.id } });
      if (roleIds.length > 0) {
        await tx.groupRole.createMany({
          data: roleIds.map((roleId) => ({ groupId: group.id, roleId })),
          skipDuplicates: true
        });
      }

      return tx.group.findUnique({
        where: { id: group.id },
        include: {
          userGroups: { select: { userId: true } },
          groupRoles: { select: { roleId: true } }
        }
      });
    });

    return this.toResponse(updated);
  }

  private async ensureUsersInTenant(tenantId: string, userIds: string[]) {
    if (userIds.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, tenantId, deletedAt: null },
      select: { id: true }
    });

    if (users.length !== new Set(userIds).size) {
      throw new BadRequestException("User not found in tenant");
    }
  }

  private async ensureRolesInTenant(tenantId: string, roleIds: string[]) {
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

  private toResponse(group: any) {
    return {
      id: group.id,
      tenantId: group.tenantId,
      name: group.name,
      memberUserIds: group.userGroups.map((item: { userId: string }) => item.userId),
      roleIds: group.groupRoles.map((item: { roleId: string }) => item.roleId),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };
  }
}
