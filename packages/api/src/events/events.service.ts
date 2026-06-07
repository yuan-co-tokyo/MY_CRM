import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";
import type { CreateEventDto, UpdateEventDto } from "./events.dto";

const EVENT_INCLUDE = {
  customer: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, email: true } }
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    user: JwtPayload,
    query: {
      from?: string;
      to?: string;
      customerId?: string;
      scope?: string;
      ownerId?: string;
    }
  ) {
    const startAtFilter: Record<string, Date> = {};
    if (query.from) startAtFilter.gte = new Date(query.from);
    if (query.to) startAtFilter.lte = new Date(query.to);

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(Object.keys(startAtFilter).length > 0 && { startAt: startAtFilter }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.scope === "mine"
        ? { ownerId: user.sub }
        : query.ownerId
          ? { ownerId: query.ownerId }
          : {})
    };

    const events = await this.prisma.event.findMany({
      where,
      include: EVENT_INCLUDE,
      orderBy: { startAt: "asc" }
    });

    return events.map((event) => this.toResponse(event));
  }

  async findOne(user: JwtPayload, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: EVENT_INCLUDE
    });
    if (!event) throw new NotFoundException("Event not found");
    return this.toResponse(event);
  }

  async create(user: JwtPayload, dto: CreateEventDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!customer) throw new BadRequestException("Customer not found");
    }

    const event = await this.prisma.event.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        location: dto.location,
        type: dto.type ?? "MEETING",
        customerId: dto.customerId ?? null,
        ownerId: dto.ownerId ?? user.sub,
        createdBy: user.sub
      },
      include: EVENT_INCLUDE
    });

    return this.toResponse(event);
  }

  async update(user: JwtPayload, id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!event) throw new NotFoundException("Event not found");

    if (dto.customerId !== undefined) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!customer) throw new NotFoundException("Customer not found");
    }

    if (dto.ownerId !== undefined) {
      const owner = await this.prisma.user.findFirst({
        where: { id: dto.ownerId, tenantId: user.tenantId },
        select: { id: true }
      });
      if (!owner) throw new NotFoundException("Owner not found");
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId })
      },
      include: EVENT_INCLUDE
    });

    return this.toResponse(updated);
  }

  async remove(user: JwtPayload, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });
    if (!event) throw new NotFoundException("Event not found");

    const removed = await this.prisma.event.update({
      where: { id: event.id },
      data: { deletedAt: new Date() },
      include: EVENT_INCLUDE
    });

    return this.toResponse(removed);
  }

  private toResponse(event: any) {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      location: event.location,
      type: event.type,
      customerId: event.customerId,
      customer: event.customer,
      ownerId: event.ownerId,
      owner: event.owner,
      createdBy: event.createdBy
    };
  }
}
