import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TasksService } from "./tasks.service";
import { PrismaService } from "../prisma/prisma.service";

const mockUser = { sub: "user1", tenantId: "tenant1", email: "u@example.com", userType: "MEMBER" };
const otherTenantUser = { sub: "user2", tenantId: "tenant2", email: "u2@example.com", userType: "MEMBER" };

const makeTask = (overrides: Partial<any> = {}) => ({
  id: "task1",
  tenantId: "tenant1",
  title: "Test Task",
  description: null,
  dueDate: null,
  status: "OPEN",
  priority: "MEDIUM",
  customerId: null,
  assigneeId: "user1",
  createdBy: "user1",
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  customer: null,
  assignee: { id: "user1", name: "User One", email: "u@example.com" },
  ...overrides
});

describe("TasksService", () => {
  let service: TasksService;
  let prismaMock: { task: Record<string, jest.Mock>; customer: Record<string, jest.Mock> };

  beforeEach(async () => {
    prismaMock = {
      task: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      customer: {
        findFirst: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prismaMock }]
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe("findAll - tenant scoping", () => {
    it("filters by tenantId", async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      await service.findAll(mockUser, {});
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: "tenant1" })
        })
      );
    });

    it("excludes soft-deleted tasks (deletedAt: null)", async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      await service.findAll(mockUser, {});
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null })
        })
      );
    });
  });

  describe("remove - soft delete", () => {
    it("sets deletedAt to current date instead of hard deleting", async () => {
      prismaMock.task.findFirst.mockResolvedValue(makeTask());
      prismaMock.task.update.mockResolvedValue(makeTask({ deletedAt: new Date() }));

      await service.remove(mockUser, "task1");

      expect(prismaMock.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) })
        })
      );
    });

    it("throws NotFoundException when task belongs to another tenant", async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);
      await expect(service.remove(otherTenantUser, "task1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("complete", () => {
    it("sets status=DONE and completedAt when reopen=false", async () => {
      prismaMock.task.findFirst.mockResolvedValue(makeTask());
      prismaMock.task.update.mockResolvedValue(makeTask({ status: "DONE", completedAt: new Date() }));

      await service.complete(mockUser, "task1", false);

      expect(prismaMock.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DONE", completedAt: expect.any(Date) })
        })
      );
    });

    it("sets status=OPEN and completedAt=null when reopen=true", async () => {
      prismaMock.task.findFirst.mockResolvedValue(makeTask({ status: "DONE", completedAt: new Date() }));
      prismaMock.task.update.mockResolvedValue(makeTask());

      await service.complete(mockUser, "task1", true);

      expect(prismaMock.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "OPEN", completedAt: null })
        })
      );
    });

    it("throws NotFoundException when task not found", async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);
      await expect(service.complete(mockUser, "nonexistent", false)).rejects.toThrow(NotFoundException);
    });
  });
});
