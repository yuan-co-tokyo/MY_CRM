import { CanActivate, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import type { AuthenticatedRequest, JwtPayload } from "./auth.types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: any) {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as AuthenticatedRequest;
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException("Unauthorized");
    }

    const hasPermissions = await this.userHasPermissions(user, required);

    if (!hasPermissions) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }

  private async userHasPermissions(user: JwtPayload, required: string[]) {
    const roleIds = await this.getRoleIdsForUser(user);

    if (roleIds.length === 0) {
      return false;
    }

    const permissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true }
    });

    const codes = new Set(permissions.map((perm) => perm.permission.code));

    return required.every((permission) => codes.has(permission));
  }

  private async getRoleIdsForUser(user: JwtPayload) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.sub },
      select: { roleId: true, role: { select: { tenantId: true, deletedAt: true } } }
    });

    const groupRoleIds = await this.prisma.groupRole.findMany({
      where: {
        group: {
          userGroups: { some: { userId: user.sub } },
          tenantId: user.tenantId,
          deletedAt: null
        },
        role: { deletedAt: null }
      },
      select: { roleId: true }
    });

    const roleIds = new Set<string>();

    for (const userRole of userRoles) {
      if (userRole.role.tenantId === user.tenantId && !userRole.role.deletedAt) {
        roleIds.add(userRole.roleId);
      }
    }

    for (const groupRole of groupRoleIds) {
      roleIds.add(groupRole.roleId);
    }

    return Array.from(roleIds);
  }
}
