import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PublicCreateCustomerDto } from "./dto/public-create-customer.dto";
import { PublicUpdateCustomerDto } from "./dto/public-update-customer.dto";

@Injectable()
export class PublicCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
    ]);
    return { data, total };
  }

  async get(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async create(tenantId: string, dto: PublicCreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        status: (dto.status as any) ?? "LEAD",
        notes: dto.notes ?? null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: PublicUpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException("Customer not found");

    return this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),
        ...(dto.status !== undefined ? { status: dto.status as any } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
      },
    });
  }
}
