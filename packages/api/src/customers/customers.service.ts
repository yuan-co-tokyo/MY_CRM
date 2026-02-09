import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

const CUSTOMER_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  assignees: {
    select: {
      user: { select: { id: true, name: true, email: true } }
    }
  }
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload, query: { ownerUserId?: string; status?: "LEAD" | "ACTIVE" | "INACTIVE" }) {
    const where = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
      ...(query.status ? { status: query.status } : {})
    };

    const customers = await this.prisma.customer.findMany({
      where,
      include: CUSTOMER_INCLUDE,
      orderBy: { createdAt: "desc" }
    });

    return customers.map((customer) => this.toResponse(customer));
  }

  async get(user: JwtPayload, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: CUSTOMER_INCLUDE
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return this.toResponse(customer);
  }

  async create(
    user: JwtPayload,
    input: {
      name: string;
      email?: string | null;
      phone?: string | null;
      status?: "LEAD" | "ACTIVE" | "INACTIVE";
      ownerUserId?: string | null;
      assigneeUserIds?: string[];
    }
  ) {
    await this.ensureUsersInTenant(user.tenantId, [input.ownerUserId, ...(input.assigneeUserIds ?? [])]);

    const customer = await this.prisma.customer.create({
      data: {
        tenantId: user.tenantId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        status: input.status ?? "LEAD",
        ownerUserId: input.ownerUserId ?? null,
        assignees: {
          create: (input.assigneeUserIds ?? []).map((assigneeUserId) => ({
            userId: assigneeUserId
          }))
        }
      },
      include: CUSTOMER_INCLUDE
    });

    return this.toResponse(customer);
  }

  async update(
    user: JwtPayload,
    id: string,
    input: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      status?: "LEAD" | "ACTIVE" | "INACTIVE";
      ownerUserId?: string | null;
      assigneeUserIds?: string[];
    }
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { assignees: true }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    const assigneeUserIds = input.assigneeUserIds;

    await this.ensureUsersInTenant(user.tenantId, [input.ownerUserId, ...(assigneeUserIds ?? [])]);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (assigneeUserIds) {
        await tx.customerAssignee.deleteMany({
          where: { customerId: customer.id }
        });
        if (assigneeUserIds.length > 0) {
          await tx.customerAssignee.createMany({
            data: assigneeUserIds.map((assigneeUserId) => ({
              customerId: customer.id,
              userId: assigneeUserId
            })),
            skipDuplicates: true
          });
        }
      }

      return tx.customer.update({
        where: { id: customer.id },
        data: {
          name: input.name ?? customer.name,
          email: input.email === undefined ? customer.email : input.email,
          phone: input.phone === undefined ? customer.phone : input.phone,
          status: input.status ?? customer.status,
          ownerUserId: input.ownerUserId === undefined ? customer.ownerUserId : input.ownerUserId
        },
        include: CUSTOMER_INCLUDE
      });
    });

    return this.toResponse(updated);
  }

  async remove(user: JwtPayload, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { deletedAt: new Date() }
    });
  }

  private async ensureUsersInTenant(tenantId: string, userIds: Array<string | null | undefined>) {
    const ids = userIds.filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      select: { id: true }
    });

    if (users.length !== new Set(ids).size) {
      throw new BadRequestException("Owner or assignee user not found in tenant");
    }
  }

  private toResponse(customer: any) {
    return {
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      owner: customer.owner,
      assignees: customer.assignees.map((assignee: { user: any }) => assignee.user),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }
}
