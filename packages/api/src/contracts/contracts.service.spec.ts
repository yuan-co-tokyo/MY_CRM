import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ContractsService } from "./contracts.service";
import { PrismaService } from "../prisma/prisma.service";

const mockUser = { sub: "user1", tenantId: "tenant1", email: "u@example.com", userType: "MEMBER" };
const otherTenantUser = { sub: "user2", tenantId: "tenant2", email: "u2@example.com", userType: "MEMBER" };

const makeContract = (overrides: Partial<any> = {}) => ({
  id: "contract1",
  tenantId: "tenant1",
  customerId: "customer1",
  status: "ACTIVE",
  category: "LIFE",
  insuranceLineId: "line1",
  insuranceTypeId: "type1",
  insuranceCompanyId: "company1",
  petName: null,
  effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
  expirationDate: new Date("2026-12-31T00:00:00.000Z"),
  applicationDate: null,
  accountingDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  insuranceLine: { id: "line1", name: "Life" },
  insuranceType: { id: "type1", name: "Whole Life" },
  insuranceCompany: { id: "company1", name: "Acme Insurance" },
  customer: { id: "customer1", name: "Customer One", customerCategory: "INDIVIDUAL" },
  ...overrides
});

const makeApplication = (overrides: Partial<any> = {}) => ({
  id: "application1",
  tenantId: "tenant1",
  customerId: "customer1",
  status: "DRAFT",
  category: "LIFE",
  insuranceLineId: "line1",
  insuranceTypeId: "type1",
  insuranceCompanyId: "company1",
  renewalSourceContractId: "contract1",
  petName: null,
  effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
  expirationDate: new Date("2026-12-31T00:00:00.000Z"),
  applicationDate: null,
  accountingDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  insuranceLine: { id: "line1", name: "Life" },
  insuranceType: { id: "type1", name: "Whole Life" },
  insuranceCompany: { id: "company1", name: "Acme Insurance" },
  ...overrides
});

describe("ContractsService", () => {
  let service: ContractsService;
  let prismaMock: {
    insuranceContract: Record<string, jest.Mock>;
    insuranceApplication: Record<string, jest.Mock>;
    customer: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prismaMock = {
      insuranceContract: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      insuranceApplication: {
        create: jest.fn()
      },
      customer: {
        findFirst: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractsService, { provide: PrismaService, useValue: prismaMock }]
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  describe("findRenewals", () => {
    it("filters active contracts by tenant, expiration date, and soft delete status", async () => {
      prismaMock.insuranceContract.findMany.mockResolvedValue([]);

      await service.findRenewals(mockUser, 45);

      expect(prismaMock.insuranceContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: "tenant1",
            status: "ACTIVE",
            expirationDate: expect.objectContaining({
              not: null,
              lte: expect.any(Date)
            }),
            deletedAt: null
          }),
          orderBy: { expirationDate: "asc" }
        })
      );
    });

    it("returns renewal contracts with customer details", async () => {
      prismaMock.insuranceContract.findMany.mockResolvedValue([makeContract()]);

      const result = await service.findRenewals(mockUser, 30);

      expect(result).toEqual([
        expect.objectContaining({
          id: "contract1",
          tenantId: "tenant1",
          status: "ACTIVE",
          customer: expect.objectContaining({ id: "customer1" })
        })
      ]);
    });
  });

  describe("startRenewal", () => {
    it("creates a draft application from an active contract", async () => {
      const contract = makeContract();
      prismaMock.insuranceContract.findFirst.mockResolvedValue(contract);
      prismaMock.insuranceApplication.create.mockResolvedValue(makeApplication());

      const result = await service.startRenewal(mockUser, "contract1");

      expect(prismaMock.insuranceContract.findFirst).toHaveBeenCalledWith({
        where: { id: "contract1", tenantId: "tenant1", deletedAt: null }
      });
      expect(prismaMock.insuranceApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant1",
            customerId: "customer1",
            status: "DRAFT",
            category: "LIFE",
            insuranceLineId: "line1",
            insuranceTypeId: "type1",
            insuranceCompanyId: "company1",
            renewalSourceContractId: "contract1",
            effectiveDate: contract.effectiveDate,
            expirationDate: contract.expirationDate
          })
        })
      );
      expect(result).toEqual(expect.objectContaining({ id: "application1", renewalSourceContractId: "contract1" }));
    });

    it("throws NotFoundException when contract belongs to another tenant", async () => {
      prismaMock.insuranceContract.findFirst.mockResolvedValue(null);

      await expect(service.startRenewal(otherTenantUser, "contract1")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when contract is not active", async () => {
      prismaMock.insuranceContract.findFirst.mockResolvedValue(makeContract({ status: "EXPIRED" }));

      await expect(service.startRenewal(mockUser, "contract1")).rejects.toThrow(BadRequestException);
      expect(prismaMock.insuranceApplication.create).not.toHaveBeenCalled();
    });
  });
});
