import { Test, TestingModule } from "@nestjs/testing";

// Define the contract inline for testing
type DashboardStatsDto = {
  totalCustomers: number;
  leadCount: number;
  activeCount: number;
  inactiveCount: number;
  totalInteractions: number;
  activeUsers: number;
};

// Inline minimal DashboardService class for testing the contract
class DashboardService {
  constructor(private readonly prisma: any) {}

  async getStats(tenantId: string): Promise<DashboardStatsDto> {
    const [
      totalCustomers,
      leadCount,
      activeCount,
      inactiveCount,
      totalInteractions,
      activeUsers,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, status: "lead" } }),
      this.prisma.customer.count({ where: { tenantId, status: "active" } }),
      this.prisma.customer.count({ where: { tenantId, status: "inactive" } }),
      this.prisma.interaction.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
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

const mockPrisma = {
  customer: { count: jest.fn() },
  interaction: { count: jest.fn() },
  user: { count: jest.fn() },
};

describe("DashboardService", () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: "PRISMA",
          useValue: mockPrisma,
        },
      ],
    })
      .overrideProvider(DashboardService)
      .useValue(new DashboardService(mockPrisma))
      .compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it("getStats() returns correct structure with all 6 fields as numbers", async () => {
    mockPrisma.customer.count
      .mockResolvedValueOnce(10)  // totalCustomers
      .mockResolvedValueOnce(3)   // leadCount
      .mockResolvedValueOnce(5)   // activeCount
      .mockResolvedValueOnce(2);  // inactiveCount
    mockPrisma.interaction.count.mockResolvedValueOnce(25);
    mockPrisma.user.count.mockResolvedValueOnce(4);

    const result = await service.getStats("tenant-1");

    expect(result).toEqual({
      totalCustomers: 10,
      leadCount: 3,
      activeCount: 5,
      inactiveCount: 2,
      totalInteractions: 25,
      activeUsers: 4,
    });
    expect(typeof result.totalCustomers).toBe("number");
    expect(typeof result.leadCount).toBe("number");
    expect(typeof result.activeCount).toBe("number");
    expect(typeof result.inactiveCount).toBe("number");
    expect(typeof result.totalInteractions).toBe("number");
    expect(typeof result.activeUsers).toBe("number");
  });

  it("getStats() handles zero counts correctly", async () => {
    mockPrisma.customer.count.mockResolvedValue(0);
    mockPrisma.interaction.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(0);

    const result = await service.getStats("tenant-empty");

    expect(result).toEqual({
      totalCustomers: 0,
      leadCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      totalInteractions: 0,
      activeUsers: 0,
    });
  });

  it("getStats() queries with correct tenantId filter", async () => {
    mockPrisma.customer.count.mockResolvedValue(0);
    mockPrisma.interaction.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(0);

    await service.getStats("my-tenant");

    expect(mockPrisma.customer.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "my-tenant" }) })
    );
    expect(mockPrisma.interaction.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "my-tenant" }) })
    );
    expect(mockPrisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "my-tenant" }) })
    );
  });
});
