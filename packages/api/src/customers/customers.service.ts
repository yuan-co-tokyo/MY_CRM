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
  corporateCustomer: {
    include: {
      parentCorporate: {
        select: {
          customerId: true,
          customer: { select: { id: true, name: true } }
        }
      },
      subsidiaries: {
        select: {
          customerId: true,
          customer: { select: { id: true, name: true } }
        }
      }
    }
  },
  householdMembership: { select: { householdId: true } }
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

  // ── Employees ──────────────────────────────────────────────────────────────

  async listEmployees(user: JwtPayload, corporateCustomerId: string) {
    await this.ensureCorporateCustomer(user, corporateCustomerId);
    const employments = await this.prisma.customerEmployment.findMany({
      where: { corporateCustomerId },
      include: {
        individualCustomer: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "asc" }
    });
    return employments.map((e) => ({
      employmentId: e.id,
      customer: e.individualCustomer,
      jobTitle: e.jobTitle,
      department: e.department,
      createdAt: e.createdAt
    }));
  }

  async addEmployee(
    user: JwtPayload,
    corporateCustomerId: string,
    input: { individualCustomerId: string; jobTitle?: string | null; department?: string | null }
  ) {
    await this.ensureCorporateCustomer(user, corporateCustomerId);

    const individual = await this.prisma.customer.findFirst({
      where: { id: input.individualCustomerId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!individual) {
      throw new NotFoundException("Individual customer not found");
    }
    if (individual.customerCategory !== "INDIVIDUAL") {
      throw new BadRequestException("Only individual customers can be added as employees");
    }

    const employment = await this.prisma.customerEmployment.create({
      data: {
        corporateCustomerId,
        individualCustomerId: input.individualCustomerId,
        jobTitle: input.jobTitle ?? null,
        department: input.department ?? null
      },
      include: {
        individualCustomer: { select: { id: true, name: true, email: true } }
      }
    });

    return {
      employmentId: employment.id,
      customer: employment.individualCustomer,
      jobTitle: employment.jobTitle,
      department: employment.department,
      createdAt: employment.createdAt
    };
  }

  async updateEmployee(
    user: JwtPayload,
    corporateCustomerId: string,
    employmentId: string,
    input: { jobTitle?: string | null; department?: string | null }
  ) {
    await this.ensureCorporateCustomer(user, corporateCustomerId);

    const employment = await this.prisma.customerEmployment.findFirst({
      where: { id: employmentId, corporateCustomerId }
    });
    if (!employment) {
      throw new NotFoundException("Employment not found");
    }

    const updated = await this.prisma.customerEmployment.update({
      where: { id: employmentId },
      data: {
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
        ...(input.department !== undefined ? { department: input.department } : {})
      },
      include: {
        individualCustomer: { select: { id: true, name: true, email: true } }
      }
    });

    return {
      employmentId: updated.id,
      customer: updated.individualCustomer,
      jobTitle: updated.jobTitle,
      department: updated.department,
      createdAt: updated.createdAt
    };
  }

  async removeEmployee(user: JwtPayload, corporateCustomerId: string, employmentId: string) {
    await this.ensureCorporateCustomer(user, corporateCustomerId);

    const employment = await this.prisma.customerEmployment.findFirst({
      where: { id: employmentId, corporateCustomerId }
    });
    if (!employment) {
      throw new NotFoundException("Employment not found");
    }

    await this.prisma.customerEmployment.delete({ where: { id: employmentId } });
  }

  // ── Subsidiaries ────────────────────────────────────────────────────────────

  async listSubsidiaries(user: JwtPayload, corporateCustomerId: string) {
    await this.ensureCorporateCustomer(user, corporateCustomerId);
    const corp = await this.prisma.corporateCustomer.findUnique({
      where: { customerId: corporateCustomerId },
      include: {
        subsidiaries: {
          select: { customerId: true, customer: { select: { id: true, name: true } } }
        },
        parentCorporate: {
          select: { customerId: true, customer: { select: { id: true, name: true } } }
        }
      }
    });
    return {
      parentCorporate: corp?.parentCorporate
        ? { id: corp.parentCorporate.customerId, name: corp.parentCorporate.customer.name }
        : null,
      subsidiaries: corp?.subsidiaries.map((s) => ({ id: s.customerId, name: s.customer.name })) ?? []
    };
  }

  async addSubsidiary(user: JwtPayload, corporateCustomerId: string, subsidiaryCustomerId: string) {
    await this.ensureCorporateCustomer(user, corporateCustomerId);

    if (corporateCustomerId === subsidiaryCustomerId) {
      throw new BadRequestException("A company cannot be its own subsidiary");
    }

    const subsidiary = await this.prisma.customer.findFirst({
      where: { id: subsidiaryCustomerId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!subsidiary) {
      throw new NotFoundException("Subsidiary customer not found");
    }
    if (subsidiary.customerCategory !== "CORPORATE") {
      throw new BadRequestException("Only corporate customers can be added as subsidiaries");
    }

    await this.prisma.corporateCustomer.update({
      where: { customerId: subsidiaryCustomerId },
      data: { parentCorporateId: corporateCustomerId }
    });

    return this.listSubsidiaries(user, corporateCustomerId);
  }

  async removeSubsidiary(user: JwtPayload, corporateCustomerId: string, subsidiaryCustomerId: string) {
    await this.ensureCorporateCustomer(user, corporateCustomerId);

    const sub = await this.prisma.corporateCustomer.findFirst({
      where: { customerId: subsidiaryCustomerId, parentCorporateId: corporateCustomerId }
    });
    if (!sub) {
      throw new NotFoundException("Subsidiary not found");
    }

    await this.prisma.corporateCustomer.update({
      where: { customerId: subsidiaryCustomerId },
      data: { parentCorporateId: null }
    });
  }

  private async ensureCorporateCustomer(user: JwtPayload, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    if (customer.customerCategory !== "CORPORATE") {
      throw new BadRequestException("Customer is not a corporate customer");
    }
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
    const corp = customer.corporateCustomer;
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
      // Household
      householdId: customer.householdMembership?.householdId ?? null,
      // Corporate-specific fields
      parentCorporateId: corp?.parentCorporateId ?? null,
      parentCorporate: corp?.parentCorporate
        ? { id: corp.parentCorporate.customerId, name: corp.parentCorporate.customer.name }
        : null,
      subsidiaries: corp?.subsidiaries?.map((s: any) => ({ id: s.customerId, name: s.customer.name })) ?? null,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }
}
