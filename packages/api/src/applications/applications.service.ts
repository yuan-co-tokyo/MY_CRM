import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";
import type { ApplicationStatus, InsuranceCategory } from "@prisma/client";

const APPLICATION_INCLUDE = {
  insuranceLine: { select: { id: true, name: true } },
  insuranceType: { select: { id: true, name: true } },
  insuranceCompany: { select: { id: true, name: true } }
};

const APPLICATION_INCLUDE_WITH_CUSTOMER = {
  ...APPLICATION_INCLUDE,
  customer: { select: { id: true, name: true, customerCategory: true } }
};

const CONTRACT_INCLUDE = {
  insuranceLine: { select: { id: true, name: true } },
  insuranceType: { select: { id: true, name: true } },
  insuranceCompany: { select: { id: true, name: true } }
};

const ALLOWED_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ["PROPOSED", "REJECTED", "WITHDRAWN"],
  PROPOSED: ["SUBMITTED", "REJECTED", "WITHDRAWN"],
  SUBMITTED: ["APPROVED", "REJECTED", "WITHDRAWN"],
  APPROVED: ["REJECTED", "WITHDRAWN"],
  CONVERTED: [],
  REJECTED: [],
  WITHDRAWN: []
};

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(user: JwtPayload, query: { status?: ApplicationStatus } = {}) {
    const applications = await this.prisma.insuranceApplication.findMany({
      where: { tenantId: user.tenantId, deletedAt: null, ...(query.status ? { status: query.status } : {}) },
      include: APPLICATION_INCLUDE_WITH_CUSTOMER,
      orderBy: { createdAt: "desc" }
    });
    return applications.map((a) => this.toResponseWithCustomer(a));
  }

  async listByCustomer(user: JwtPayload, customerId: string) {
    // Verify customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const applications = await this.prisma.insuranceApplication.findMany({
      where: { customerId, tenantId: user.tenantId, deletedAt: null },
      include: APPLICATION_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    return applications.map((a) => this.toResponse(a));
  }

  async get(user: JwtPayload, id: string) {
    const application = await this.prisma.insuranceApplication.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: APPLICATION_INCLUDE
    });
    if (!application) throw new NotFoundException("Application not found");
    return this.toResponse(application);
  }

  async create(
    user: JwtPayload,
    customerId: string,
    input: {
      category: InsuranceCategory;
      insuranceLineId?: string | null;
      insuranceTypeId?: string | null;
      insuranceCompanyId?: string | null;
      petName?: string | null;
      effectiveDate?: string | null;
      expirationDate?: string | null;
      applicationDate?: string | null;
      accountingDate?: string | null;
    }
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const application = await this.prisma.insuranceApplication.create({
      data: {
        tenantId: user.tenantId,
        customerId,
        category: input.category,
        insuranceLineId: input.insuranceLineId ?? null,
        insuranceTypeId: input.insuranceTypeId ?? null,
        insuranceCompanyId: input.insuranceCompanyId ?? null,
        petName: input.petName ?? null,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
        expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
        applicationDate: input.applicationDate ? new Date(input.applicationDate) : null,
        accountingDate: input.accountingDate ? new Date(input.accountingDate) : null
      },
      include: APPLICATION_INCLUDE
    });
    return this.toResponse(application);
  }

  async update(
    user: JwtPayload,
    id: string,
    input: {
      category?: InsuranceCategory;
      insuranceLineId?: string | null;
      insuranceTypeId?: string | null;
      insuranceCompanyId?: string | null;
      petName?: string | null;
      effectiveDate?: string | null;
      expirationDate?: string | null;
      applicationDate?: string | null;
      accountingDate?: string | null;
    }
  ) {
    const application = await this.prisma.insuranceApplication.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!application) throw new NotFoundException("Application not found");

    const updated = await this.prisma.insuranceApplication.update({
      where: { id },
      data: {
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.insuranceLineId !== undefined ? { insuranceLineId: input.insuranceLineId } : {}),
        ...(input.insuranceTypeId !== undefined ? { insuranceTypeId: input.insuranceTypeId } : {}),
        ...(input.insuranceCompanyId !== undefined ? { insuranceCompanyId: input.insuranceCompanyId } : {}),
        ...(input.petName !== undefined ? { petName: input.petName } : {}),
        ...(input.effectiveDate !== undefined ? { effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null } : {}),
        ...(input.expirationDate !== undefined ? { expirationDate: input.expirationDate ? new Date(input.expirationDate) : null } : {}),
        ...(input.applicationDate !== undefined ? { applicationDate: input.applicationDate ? new Date(input.applicationDate) : null } : {}),
        ...(input.accountingDate !== undefined ? { accountingDate: input.accountingDate ? new Date(input.accountingDate) : null } : {})
      },
      include: APPLICATION_INCLUDE
    });
    return this.toResponse(updated);
  }

  async updateStatus(user: JwtPayload, id: string, newStatus: ApplicationStatus) {
    const application = await this.prisma.insuranceApplication.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!application) throw new NotFoundException("Application not found");

    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[application.status];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition application from ${application.status} to ${newStatus}`);
    }

    const updated = await this.prisma.insuranceApplication.update({
      where: { id },
      data: { status: newStatus },
      include: APPLICATION_INCLUDE
    });
    return this.toResponse(updated);
  }

  async convert(user: JwtPayload, id: string) {
    const application = await this.prisma.insuranceApplication.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!application) throw new NotFoundException("Application not found");
    if (application.status !== "APPROVED") {
      throw new BadRequestException("Only APPROVED applications can be converted");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.insuranceApplication.update({
        where: { id },
        data: { status: "CONVERTED" }
      });

      if (application.renewalSourceContractId) {
        await tx.insuranceContract.update({
          where: { id: application.renewalSourceContractId },
          data: { status: "RENEWED" }
        });
      }

      return tx.insuranceContract.create({
        data: {
          tenantId: application.tenantId,
          customerId: application.customerId,
          category: application.category,
          insuranceLineId: application.insuranceLineId,
          insuranceTypeId: application.insuranceTypeId,
          insuranceCompanyId: application.insuranceCompanyId,
          petName: application.petName,
          effectiveDate: application.effectiveDate,
          expirationDate: application.expirationDate,
          status: "ACTIVE",
          previousContractId: application.renewalSourceContractId
        },
        include: CONTRACT_INCLUDE
      });
    });
  }

  async remove(user: JwtPayload, id: string) {
    const application = await this.prisma.insuranceApplication.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!application) throw new NotFoundException("Application not found");

    await this.prisma.insuranceApplication.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  private toResponse(application: any) {
    return {
      id: application.id,
      tenantId: application.tenantId,
      customerId: application.customerId,
      status: application.status,
      category: application.category,
      insuranceLine: application.insuranceLine,
      insuranceType: application.insuranceType,
      insuranceCompany: application.insuranceCompany,
      renewalSourceContractId: application.renewalSourceContractId,
      petName: application.petName,
      effectiveDate: application.effectiveDate,
      expirationDate: application.expirationDate,
      applicationDate: application.applicationDate,
      accountingDate: application.accountingDate,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt
    };
  }

  private toResponseWithCustomer(application: any) {
    return {
      ...this.toResponse(application),
      customer: application.customer
    };
  }
}
