import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

const CUSTOMER_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  assignees: {
    select: {
      user: { select: { id: true, name: true, email: true } }
    }
  },
  individualCustomer: true,
  corporateCustomer: true,
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
      customerCategory?: "INDIVIDUAL" | "CORPORATE" | null;
      gender?: "MALE" | "FEMALE" | "OTHER" | null;
      birthDate?: string | null;
      postalCode?: string | null;
      address?: string | null;
      mobilePhone?: string | null;
      workCompany?: string | null;
      workPhone?: string | null;
      workEmail?: string | null;
      annualIncome?: number | null;
      notes?: string | null;
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
        customerCategory: input.customerCategory ?? null,
        postalCode: input.postalCode ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        assignees: {
          create: (input.assigneeUserIds ?? []).map((assigneeUserId) => ({
            userId: assigneeUserId
          }))
        },
        ...(input.customerCategory === "INDIVIDUAL" ? {
          individualCustomer: {
            create: {
              gender:       input.gender       ?? null,
              birthDate:    input.birthDate    ? new Date(input.birthDate) : null,
              mobilePhone:  input.mobilePhone  ?? null,
              workCompany:  input.workCompany  ?? null,
              workPhone:    input.workPhone    ?? null,
              workEmail:    input.workEmail    ?? null,
              annualIncome: input.annualIncome ?? null,
            }
          }
        } : {}),
        ...(input.customerCategory === "CORPORATE" ? {
          corporateCustomer: { create: {} }
        } : {}),
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
      customerCategory?: "INDIVIDUAL" | "CORPORATE" | null;
      gender?: "MALE" | "FEMALE" | "OTHER" | null;
      birthDate?: string | null;
      postalCode?: string | null;
      address?: string | null;
      mobilePhone?: string | null;
      workCompany?: string | null;
      workPhone?: string | null;
      workEmail?: string | null;
      annualIncome?: number | null;
      notes?: string | null;
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

      const newCategory = input.customerCategory === undefined
        ? customer.customerCategory
        : input.customerCategory;

      if (newCategory === "INDIVIDUAL") {
        await tx.individualCustomer.upsert({
          where: { customerId: customer.id },
          create: {
            customerId:   customer.id,
            gender:       input.gender       ?? null,
            birthDate:    input.birthDate    ? new Date(input.birthDate) : null,
            mobilePhone:  input.mobilePhone  ?? null,
            workCompany:  input.workCompany  ?? null,
            workPhone:    input.workPhone    ?? null,
            workEmail:    input.workEmail    ?? null,
            annualIncome: input.annualIncome ?? null,
          },
          update: {
            ...(input.gender       !== undefined ? { gender:       input.gender       ?? null } : {}),
            ...(input.birthDate    !== undefined ? { birthDate:    input.birthDate ? new Date(input.birthDate) : null } : {}),
            ...(input.mobilePhone  !== undefined ? { mobilePhone:  input.mobilePhone  ?? null } : {}),
            ...(input.workCompany  !== undefined ? { workCompany:  input.workCompany  ?? null } : {}),
            ...(input.workPhone    !== undefined ? { workPhone:    input.workPhone    ?? null } : {}),
            ...(input.workEmail    !== undefined ? { workEmail:    input.workEmail    ?? null } : {}),
            ...(input.annualIncome !== undefined ? { annualIncome: input.annualIncome ?? null } : {}),
          }
        });
        await tx.corporateCustomer.deleteMany({ where: { customerId: customer.id } });

      } else if (newCategory === "CORPORATE") {
        await tx.corporateCustomer.upsert({
          where: { customerId: customer.id },
          create: { customerId: customer.id },
          update: {}
        });
        await tx.individualCustomer.deleteMany({ where: { customerId: customer.id } });

      } else {
        await tx.individualCustomer.deleteMany({ where: { customerId: customer.id } });
        await tx.corporateCustomer.deleteMany({ where: { customerId: customer.id } });
      }

      return tx.customer.update({
        where: { id: customer.id },
        data: {
          name:             input.name             ?? customer.name,
          email:            input.email            === undefined ? customer.email            : input.email,
          phone:            input.phone            === undefined ? customer.phone            : input.phone,
          status:           input.status           ?? customer.status,
          ownerUserId:      input.ownerUserId      === undefined ? customer.ownerUserId      : input.ownerUserId,
          customerCategory: input.customerCategory === undefined ? customer.customerCategory : input.customerCategory,
          postalCode:       input.postalCode       === undefined ? customer.postalCode       : input.postalCode,
          address:          input.address          === undefined ? customer.address          : input.address,
          notes:            input.notes            === undefined ? customer.notes            : input.notes,
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
    const ind = customer.individualCustomer;
    return {
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      owner: customer.owner,
      assignees: customer.assignees.map((assignee: { user: any }) => assignee.user),
      customerCategory: customer.customerCategory,
      postalCode: customer.postalCode,
      address: customer.address,
      notes: customer.notes,
      // Individual-specific fields — sourced from IndividualCustomer sub-table
      gender:       ind?.gender       ?? null,
      birthDate:    ind?.birthDate    ?? null,
      mobilePhone:  ind?.mobilePhone  ?? null,
      workCompany:  ind?.workCompany  ?? null,
      workPhone:    ind?.workPhone    ?? null,
      workEmail:    ind?.workEmail    ?? null,
      annualIncome: ind?.annualIncome ?? null,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }
}
