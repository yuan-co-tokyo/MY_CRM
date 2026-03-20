import { Injectable, NotFoundException } from "@nestjs/common";
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
}
