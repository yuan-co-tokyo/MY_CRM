import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

const INTERACTION_INCLUDE = {
  customer: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, email: true } }
};

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: JwtPayload,
    query: { customerId?: string; userId?: string; type?: "CALL" | "EMAIL" | "MEETING" | "NOTE" }
  ) {
    const where = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.type ? { type: query.type } : {})
    };

    const interactions = await this.prisma.interaction.findMany({
      where,
      include: INTERACTION_INCLUDE,
      orderBy: { occurredAt: "desc" }
    });

    return interactions.map((interaction) => this.toResponse(interaction));
  }

  async get(user: JwtPayload, id: string) {
    const interaction = await this.prisma.interaction.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: INTERACTION_INCLUDE
    });

    if (!interaction) {
      throw new NotFoundException("Interaction not found");
    }

    return this.toResponse(interaction);
  }

  async create(
    user: JwtPayload,
    input: {
      customerId: string;
      type: "CALL" | "EMAIL" | "MEETING" | "NOTE";
      note: string;
      occurredAt: string;
    }
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true }
    });

    if (!customer) {
      throw new BadRequestException("Customer not found");
    }

    const interaction = await this.prisma.interaction.create({
      data: {
        tenantId: user.tenantId,
        customerId: customer.id,
        userId: user.sub,
        type: input.type,
        note: input.note,
        occurredAt: new Date(input.occurredAt)
      },
      include: INTERACTION_INCLUDE
    });

    return this.toResponse(interaction);
  }

  async update(
    user: JwtPayload,
    id: string,
    input: {
      type?: "CALL" | "EMAIL" | "MEETING" | "NOTE";
      note?: string;
      occurredAt?: string;
    }
  ) {
    const interaction = await this.prisma.interaction.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!interaction) {
      throw new NotFoundException("Interaction not found");
    }

    const updated = await this.prisma.interaction.update({
      where: { id: interaction.id },
      data: {
        type: input.type ?? interaction.type,
        note: input.note ?? interaction.note,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : interaction.occurredAt
      },
      include: INTERACTION_INCLUDE
    });

    return this.toResponse(updated);
  }

  async remove(user: JwtPayload, id: string) {
    const interaction = await this.prisma.interaction.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!interaction) {
      throw new NotFoundException("Interaction not found");
    }

    await this.prisma.interaction.update({
      where: { id: interaction.id },
      data: { deletedAt: new Date() }
    });
  }

  private toResponse(interaction: any) {
    return {
      id: interaction.id,
      tenantId: interaction.tenantId,
      customer: interaction.customer,
      user: interaction.user,
      type: interaction.type,
      note: interaction.note,
      occurredAt: interaction.occurredAt,
      createdAt: interaction.createdAt,
      updatedAt: interaction.updatedAt
    };
  }
}
