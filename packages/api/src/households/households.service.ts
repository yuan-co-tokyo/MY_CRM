import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

const HOUSEHOLD_INCLUDE = {
  members: {
    where: { customer: { deletedAt: null } },
    select: {
      customer: { select: { id: true, name: true } }
    }
  }
};

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload) {
    const households = await this.prisma.household.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: HOUSEHOLD_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    return households.map((h) => this.toResponse(h));
  }

  async get(user: JwtPayload, id: string) {
    const household = await this.prisma.household.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: HOUSEHOLD_INCLUDE
    });
    if (!household) {
      throw new NotFoundException("Household not found");
    }
    return this.toResponse(household);
  }

  async create(user: JwtPayload, input: { name: string; postalCode?: string | null; address?: string | null; phone?: string | null }) {
    const household = await this.prisma.household.create({
      data: {
        tenantId: user.tenantId,
        name: input.name,
        postalCode: input.postalCode ?? null,
        address: input.address ?? null,
        phone: input.phone ?? null
      },
      include: HOUSEHOLD_INCLUDE
    });
    return this.toResponse(household);
  }

  async update(
    user: JwtPayload,
    id: string,
    input: { name?: string; postalCode?: string | null; address?: string | null; phone?: string | null }
  ) {
    const household = await this.prisma.household.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!household) {
      throw new NotFoundException("Household not found");
    }
    const updated = await this.prisma.household.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {})
      },
      include: HOUSEHOLD_INCLUDE
    });
    return this.toResponse(updated);
  }

  async remove(user: JwtPayload, id: string) {
    const household = await this.prisma.household.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!household) {
      throw new NotFoundException("Household not found");
    }
    await this.prisma.household.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async addMember(user: JwtPayload, householdId: string, customerId: string) {
    const household = await this.prisma.household.findFirst({
      where: { id: householdId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!household) {
      throw new NotFoundException("Household not found");
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId, deletedAt: null },
      include: { individualCustomer: true }
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    if (customer.customerCategory !== "INDIVIDUAL") {
      throw new BadRequestException("Only individual customers can be added to a household");
    }

    const existing = await this.prisma.householdMembership.findUnique({
      where: { customerId }
    });
    if (existing) {
      throw new BadRequestException("Customer already belongs to a household");
    }

    await this.prisma.householdMembership.create({
      data: { householdId, customerId }
    });

    return this.get(user, householdId);
  }

  async removeMember(user: JwtPayload, householdId: string, customerId: string) {
    const household = await this.prisma.household.findFirst({
      where: { id: householdId, tenantId: user.tenantId, deletedAt: null }
    });
    if (!household) {
      throw new NotFoundException("Household not found");
    }

    const membership = await this.prisma.householdMembership.findUnique({
      where: { customerId }
    });
    if (!membership || membership.householdId !== householdId) {
      throw new NotFoundException("Membership not found");
    }

    await this.prisma.householdMembership.delete({
      where: { customerId }
    });

    return this.get(user, householdId);
  }

  private toResponse(household: any) {
    return {
      id: household.id,
      tenantId: household.tenantId,
      name: household.name,
      postalCode: household.postalCode,
      address: household.address,
      phone: household.phone,
      members: household.members.map((m: any) => m.customer),
      createdAt: household.createdAt,
      updatedAt: household.updatedAt
    };
  }
}
