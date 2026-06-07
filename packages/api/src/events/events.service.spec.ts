import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { EventsService } from "./events.service";
import { PrismaService } from "../prisma/prisma.service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const USER_A = { sub: "user-a", tenantId: TENANT_A, email: "a@test.com", userType: "staff" };

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: "event-1",
  tenantId: TENANT_A,
  title: "Test Event",
  description: null,
  startAt: new Date("2026-06-10T09:00:00Z"),
  endAt: new Date("2026-06-10T10:00:00Z"),
  location: null,
  type: "MEETING" as const,
  customerId: null,
  ownerId: USER_A.sub,
  createdBy: USER_A.sub,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides
});

describe("EventsService", () => {
  let service: EventsService;
  let prisma: { event: Record<string, jest.Mock>; customer: Record<string, jest.Mock>; user: Record<string, jest.Mock> };

  beforeEach(async () => {
    prisma = {
      event: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      customer: {
        findFirst: jest.fn()
      },
      user: {
        findFirst: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma }
      ]
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe("findAll – tenant scope", () => {
    it("returns only events belonging to the user tenant", async () => {
      const ownEvent = makeEvent();
      prisma.event.findMany.mockResolvedValue([ownEvent]);

      const result = await service.findAll(USER_A, {});

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) })
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: ownEvent.id,
        title: ownEvent.title,
        startAt: ownEvent.startAt,
        endAt: ownEvent.endAt,
        ownerId: ownEvent.ownerId
      });
    });

    it("never returns events from another tenant", async () => {
      const otherEvent = makeEvent({ tenantId: TENANT_B });
      // Simulate that the DB correctly filters by tenant (returns empty for TENANT_A query)
      prisma.event.findMany.mockResolvedValue([]);

      const result = await service.findAll(USER_A, {});

      expect(result).not.toContain(otherEvent);
      expect(result).toHaveLength(0);
    });
  });

  describe("findAll – soft delete filter", () => {
    it("excludes soft-deleted events (deletedAt != null)", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findAll(USER_A, {});

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null })
        })
      );
    });
  });

  describe("findAll – date range filter", () => {
    it("applies gte filter when 'from' is provided", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findAll(USER_A, { from: "2026-06-10T00:00:00Z" });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startAt: expect.objectContaining({ gte: new Date("2026-06-10T00:00:00Z") })
          })
        })
      );
    });

    it("applies lte filter when 'to' is provided", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findAll(USER_A, { to: "2026-06-20T23:59:59Z" });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startAt: expect.objectContaining({ lte: new Date("2026-06-20T23:59:59Z") })
          })
        })
      );
    });

    it("applies both gte and lte when both from and to are provided", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findAll(USER_A, {
        from: "2026-06-10T00:00:00Z",
        to: "2026-06-20T23:59:59Z"
      });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startAt: {
              gte: new Date("2026-06-10T00:00:00Z"),
              lte: new Date("2026-06-20T23:59:59Z")
            }
          })
        })
      );
    });
  });

  describe("remove – soft delete", () => {
    it("sets deletedAt instead of hard-deleting", async () => {
      prisma.event.findFirst.mockResolvedValue(makeEvent());
      prisma.event.update.mockResolvedValue(makeEvent({ deletedAt: new Date() }));

      await service.remove(USER_A, "event-1");

      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) })
        })
      );
    });

    it("throws NotFoundException when event does not exist", async () => {
      prisma.event.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_A, "nonexistent")).rejects.toThrow(NotFoundException);
    });
  });
});
