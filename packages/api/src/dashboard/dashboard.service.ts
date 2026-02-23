import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardStatsDto } from "./dashboard.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string): Promise<DashboardStatsDto> {
    const [
      totalCustomers,
      leadCount,
      activeCount,
      inactiveCount,
      totalInteractions,
      activeUsers,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.customer.count({
        where: { tenantId, deletedAt: null, status: "LEAD" },
      }),
      this.prisma.customer.count({
        where: { tenantId, deletedAt: null, status: "ACTIVE" },
      }),
      this.prisma.customer.count({
        where: { tenantId, deletedAt: null, status: "INACTIVE" },
      }),
      this.prisma.interaction.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.user.count({
        where: { tenantId, deletedAt: null, status: "ACTIVE" },
      }),
    ]);

    return {
      totalCustomers,
      leadCount,
      activeCount,
      inactiveCount,
      totalInteractions,
      activeUsers,
    };
  }
}
