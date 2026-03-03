import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tenants ────────────────────────────────────────────────────────────────

  async listTenants() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null, name: { not: "__system__" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true }
    });
  }

  async createTenant(name: string) {
    return this.prisma.tenant.create({
      data: { name },
      select: { id: true, name: true, createdAt: true, updatedAt: true }
    });
  }

  async updateTenant(id: string, name: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null }
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    return this.prisma.tenant.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, createdAt: true, updatedAt: true }
    });
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null }
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(tenantId?: string) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        userType: { not: "SUPER_ADMIN" },
        ...(tenantId ? { tenantId } : {})
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        userType: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true } }
      }
    });
  }

  async createUser(data: {
    tenantId: string;
    email: string;
    password: string;
    name: string;
    userType?: string;
    status?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        passwordHash,
        name: data.name,
        userType: (data.userType as any) ?? "STANDARD",
        status: (data.status as any) ?? "ACTIVE"
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        userType: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true } }
      }
    });
  }

  async updateUser(
    id: string,
    data: { email?: string; name?: string; status?: string; userType?: string }
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email ? { email: data.email } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.status ? { status: data.status as any } : {}),
        ...(data.userType ? { userType: data.userType as any } : {})
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        userType: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true } }
      }
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
