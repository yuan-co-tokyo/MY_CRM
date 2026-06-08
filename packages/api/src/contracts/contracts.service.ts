import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";
import type { InsuranceCategory } from "@prisma/client";

const CONTRACT_INCLUDE = {
  insuranceLine: { select: { id: true, name: true } },
  insuranceType: { select: { id: true, name: true } },
  insuranceCompany: { select: { id: true, name: true } }
};

const CONTRACT_INCLUDE_WITH_CUSTOMER = {
  ...CONTRACT_INCLUDE,
  customer: { select: { id: true, name: true, customerCategory: true } }
};

const APPLICATION_INCLUDE = {
  insuranceLine: { select: { id: true, name: true } },
  insuranceType: { select: { id: true, name: true } },
  insuranceCompany: { select: { id: true, name: true } }
};

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(user: JwtPayload) {
    const contracts = await this.prisma.insuranceContract.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: CONTRACT_INCLUDE_WITH_CUSTOMER,
      orderBy: { createdAt: "desc" }
    });
    return contracts.map((c) => this.toResponseWithCustomer(c));
  }

  async findRenewals(user: JwtPayload, withinDays: number) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const expiresBy = new Date(today);
    expiresBy.setUTCDate(expiresBy.getUTCDate() + withinDays);

    const contracts = await this.prisma.insuranceContract.findMany({
      where: {
        tenantId: user.tenantId,
        status: "ACTIVE",
        expirationDate: { not: null, lte: expiresBy },
        deletedAt: null
      },
      include: CONTRACT_INCLUDE_WITH_CUSTOMER,
      orderBy: { expirationDate: "asc" }
    });
    return contracts.map((c) => this.toResponseWithCustomer(c));
  }

  async listByCustomer(user: JwtPayload, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const contracts = await this.prisma.insuranceContract.findMany({
      where: { customerId, tenantId: user.tenantId, deletedAt: null },
      include: CONTRACT_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    return contracts.map((c) => this.toResponse(c));
  }

  async get(user: JwtPayload, id: string) {
    const contract = await this.prisma.insuranceContract.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: CONTRACT_INCLUDE
    });
    if (!contract) throw new NotFoundException("Contract not found");
    return this.toResponse(contract);
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

    const contract = await this.prisma.insuranceContract.create({
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
      include: CONTRACT_INCLUDE
    });
    return this.toResponse(contract);
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
    const contract = await this.prisma.insuranceContract.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!contract) throw new NotFoundException("Contract not found");

    const updated = await this.prisma.insuranceContract.update({
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
      include: CONTRACT_INCLUDE
    });
    return this.toResponse(updated);
  }

  async startRenewal(user: JwtPayload, contractId: string) {
    const contract = await this.prisma.insuranceContract.findFirst({
      where: { id: contractId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!contract) throw new NotFoundException("Contract not found");
    if (contract.status !== "ACTIVE") throw new BadRequestException("Contract is not renewable");

    const application = await this.prisma.insuranceApplication.create({
      data: {
        tenantId: contract.tenantId,
        customerId: contract.customerId,
        status: "DRAFT",
        category: contract.category,
        insuranceLineId: contract.insuranceLineId,
        insuranceTypeId: contract.insuranceTypeId,
        insuranceCompanyId: contract.insuranceCompanyId,
        renewalSourceContractId: contractId,
        petName: contract.petName,
        effectiveDate: contract.effectiveDate,
        expirationDate: contract.expirationDate
      },
      include: APPLICATION_INCLUDE
    });
    return this.toApplicationResponse(application);
  }

  async remove(user: JwtPayload, id: string) {
    const contract = await this.prisma.insuranceContract.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!contract) throw new NotFoundException("Contract not found");

    await this.prisma.insuranceContract.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  private toResponse(contract: any) {
    return {
      id: contract.id,
      tenantId: contract.tenantId,
      customerId: contract.customerId,
      status: contract.status,
      category: contract.category,
      insuranceLine: contract.insuranceLine,
      insuranceType: contract.insuranceType,
      insuranceCompany: contract.insuranceCompany,
      petName: contract.petName,
      effectiveDate: contract.effectiveDate,
      expirationDate: contract.expirationDate,
      applicationDate: contract.applicationDate,
      accountingDate: contract.accountingDate,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt
    };
  }

  private toResponseWithCustomer(contract: any) {
    return {
      ...this.toResponse(contract),
      customer: contract.customer
    };
  }

  private toApplicationResponse(application: any) {
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
}
