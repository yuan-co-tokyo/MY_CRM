import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ApplicationsService } from "./applications.service";
import { PrismaService } from "../prisma/prisma.service";

const mockUser = { sub: "user1", tenantId: "tenant1", email: "u@example.com", userType: "MEMBER" };
const otherTenantUser = { sub: "user2", tenantId: "tenant2", email: "u2@example.com", userType: "MEMBER" };

const makeApplication = (overrides: Partial<any> = {}) => ({
  id: "app1",
  tenantId: "tenant1",
  customerId: "customer1",
  status: "APPROVED",
  category: "AUTO",
  insuranceLineId: "line1",
  insuranceTypeId: "type1",
  insuranceCompanyId: "company1",
  renewalSourceContractId: "contract-old",
  petName: "Pochi",
  effectiveDate: new Date("2026-04-01T00:00:00.000Z"),
  expirationDate: new Date("2027-03-31T00:00:00.000Z"),
  applicationDate: null,
  accountingDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides
});

const makeContract = (overrides: Partial<any> = {}) => ({
  id: "contract-new",
  tenantId: "tenant1",
  customerId: "customer1",
  status: "ACTIVE",
  previousContractId: "contract-old",
  category: "AUTO",
  insuranceLineId: "line1",
  insuranceTypeId: "type1",
  insuranceCompanyId: "company1",
  petName: "Pochi",
  effectiveDate: new Date("2026-04-01T00:00:00.000Z"),
  expirationDate: new Date("2027-03-31T00:00:00.000Z"),
  applicationDate: null,
  accountingDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  insuranceLine: null,
  insuranceType: null,
  insuranceCompany: null,
  ...overrides
});

describe("ApplicationsService", () => {
  let service: ApplicationsService;
  let prismaMock: {
    insuranceApplication: Record<string, jest.Mock>;
    insuranceContract: Record<string, jest.Mock>;
    customer: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let txMock: {
    insuranceApplication: Record<string, jest.Mock>;
    insuranceContract: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    txMock = {
      insuranceApplication: {
        update: jest.fn()
      },
      insuranceContract: {
        update: jest.fn(),
        create: jest.fn()
      }
    };

    prismaMock = {
      insuranceApplication: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      insuranceContract: {
        update: jest.fn(),
        create: jest.fn()
      },
      customer: {
        findFirst: jest.fn()
      },
      $transaction: jest.fn((callback) => callback(txMock))
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ApplicationsService, { provide: PrismaService, useValue: prismaMock }]
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  describe("convert", () => {
    it("converts an approved renewal application atomically", async () => {
      const application = makeApplication();
      const newContract = makeContract();
      prismaMock.insuranceApplication.findFirst.mockResolvedValue(application);
      txMock.insuranceApplication.update.mockResolvedValue({ ...application, status: "CONVERTED" });
      txMock.insuranceContract.update.mockResolvedValue({ id: "contract-old", status: "RENEWED" });
      txMock.insuranceContract.create.mockResolvedValue(newContract);

      const result = await service.convert(mockUser, "app1");

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insuranceApplication.update).toHaveBeenCalledWith({
        where: { id: "app1" },
        data: { status: "CONVERTED" }
      });
      expect(txMock.insuranceContract.update).toHaveBeenCalledWith({
        where: { id: "contract-old" },
        data: { status: "RENEWED" }
      });
      expect(txMock.insuranceContract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant1",
            customerId: "customer1",
            category: "AUTO",
            insuranceLineId: "line1",
            insuranceTypeId: "type1",
            insuranceCompanyId: "company1",
            petName: "Pochi",
            effectiveDate: application.effectiveDate,
            expirationDate: application.expirationDate,
            status: "ACTIVE",
            previousContractId: "contract-old"
          })
        })
      );
      expect(result).toBe(newContract);
    });

    it("propagates transaction errors so Prisma can roll back all changes", async () => {
      const failure = new Error("create failed");
      prismaMock.insuranceApplication.findFirst.mockResolvedValue(makeApplication());
      txMock.insuranceApplication.update.mockResolvedValue(makeApplication({ status: "CONVERTED" }));
      txMock.insuranceContract.update.mockResolvedValue({ id: "contract-old", status: "RENEWED" });
      txMock.insuranceContract.create.mockRejectedValue(failure);

      await expect(service.convert(mockUser, "app1")).rejects.toThrow("create failed");

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insuranceApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "CONVERTED" } })
      );
      expect(txMock.insuranceContract.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "RENEWED" } })
      );
    });

    it("throws NotFoundException when converting another tenant's application", async () => {
      prismaMock.insuranceApplication.findFirst.mockResolvedValue(null);

      await expect(service.convert(otherTenantUser, "app1")).rejects.toThrow(NotFoundException);

      expect(prismaMock.insuranceApplication.findFirst).toHaveBeenCalledWith({
        where: { id: "app1", tenantId: "tenant2", deletedAt: null }
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});
