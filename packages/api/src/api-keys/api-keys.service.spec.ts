import { Test, TestingModule } from "@nestjs/testing";
import { ApiKeysService } from "./api-keys.service";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";

const mockUser: JwtPayload = {
  sub: "user-1",
  tenantId: "tenant-1",
  email: "test@example.com",
  userType: "MEMBER",
};

const otherUser: JwtPayload = {
  sub: "user-2",
  tenantId: "tenant-2",
  email: "other@example.com",
  userType: "MEMBER",
};

function makeApiKeyRecord(overrides: Partial<any> = {}) {
  return {
    id: "key-1",
    tenantId: "tenant-1",
    name: "Test Key",
    keyHash: "abc",
    keyPrefix: "crm_abcdefgh",
    createdBy: "user-1",
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    deletedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("ApiKeysService", () => {
  let service: ApiKeysService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  // ── generate ──────────────────────────────────────────────────────────────

  describe("generate", () => {
    it("returns plainKey and ApiKeyResponseDto without keyHash", async () => {
      const record = makeApiKeyRecord();
      prisma.apiKey.create.mockResolvedValue(record);

      const result = await service.generate(mockUser, { name: "Test Key" });

      expect(result.plainKey).toBeDefined();
      expect(result.plainKey).toMatch(/^crm_/);
      expect((result as any).keyHash).toBeUndefined();
      expect(result.id).toBe("key-1");
      expect(result.name).toBe("Test Key");
      expect(result.keyPrefix).toBe("crm_abcdefgh");
    });

    it("passes tenantId and createdBy from user payload", async () => {
      const record = makeApiKeyRecord();
      prisma.apiKey.create.mockResolvedValue(record);

      await service.generate(mockUser, { name: "My Key" });

      const createCall = prisma.apiKey.create.mock.calls[0][0];
      expect(createCall.data.tenantId).toBe("tenant-1");
      expect(createCall.data.createdBy).toBe("user-1");
    });

    it("sets expiresAt when provided", async () => {
      const expiresAt = "2030-12-31T00:00:00.000Z";
      const record = makeApiKeyRecord({ expiresAt: new Date(expiresAt) });
      prisma.apiKey.create.mockResolvedValue(record);

      await service.generate(mockUser, { name: "Expiring Key", expiresAt });

      const createCall = prisma.apiKey.create.mock.calls[0][0];
      expect(createCall.data.expiresAt).toEqual(new Date(expiresAt));
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns ApiKeyResponseDto array without plainKey or keyHash", async () => {
      const record = makeApiKeyRecord();
      prisma.apiKey.findMany.mockResolvedValue([record]);

      const result = await service.list(mockUser);

      expect(result).toHaveLength(1);
      expect((result[0] as any).plainKey).toBeUndefined();
      expect((result[0] as any).keyHash).toBeUndefined();
      expect(result[0].id).toBe("key-1");
    });

    it("filters by tenantId", async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);

      await service.list(mockUser);

      const findCall = prisma.apiKey.findMany.mock.calls[0][0];
      expect(findCall.where.tenantId).toBe("tenant-1");
      expect(findCall.where.deletedAt).toBeNull();
    });
  });

  // ── revoke ────────────────────────────────────────────────────────────────

  describe("revoke", () => {
    it("revokes a key by id within the same tenant", async () => {
      prisma.apiKey.updateMany.mockResolvedValue({ count: 1 });

      await service.revoke(mockUser, "key-1");

      const updateCall = prisma.apiKey.updateMany.mock.calls[0][0];
      expect(updateCall.where.id).toBe("key-1");
      expect(updateCall.where.tenantId).toBe("tenant-1");
      expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
    });

    it("does not affect keys of another tenant (tenantId guard)", async () => {
      prisma.apiKey.updateMany.mockResolvedValue({ count: 0 });

      await service.revoke(otherUser, "key-1");

      const updateCall = prisma.apiKey.updateMany.mock.calls[0][0];
      expect(updateCall.where.tenantId).toBe("tenant-2");
    });
  });

  // ── validateKey ───────────────────────────────────────────────────────────

  describe("validateKey", () => {
    it("returns tenantId and apiKeyId for a valid key", async () => {
      const record = makeApiKeyRecord();
      prisma.apiKey.findFirst.mockResolvedValue(record);
      prisma.apiKey.update.mockResolvedValue(record);

      const result = await service.validateKey("crm_somerawkey");

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe("tenant-1");
      expect(result!.apiKeyId).toBe("key-1");
    });

    it("returns null for unknown key", async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      const result = await service.validateKey("crm_unknown");

      expect(result).toBeNull();
    });

    it("returns null for revoked key (findFirst returns null due to revokedAt filter)", async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      const result = await service.validateKey("crm_revoked");

      expect(result).toBeNull();
    });

    it("returns null for expired key", async () => {
      const expiredRecord = makeApiKeyRecord({
        expiresAt: new Date("2020-01-01"),
      });
      prisma.apiKey.findFirst.mockResolvedValue(expiredRecord);

      const result = await service.validateKey("crm_expired");

      expect(result).toBeNull();
    });

    it("updates lastUsedAt on successful validation", async () => {
      const record = makeApiKeyRecord();
      prisma.apiKey.findFirst.mockResolvedValue(record);
      prisma.apiKey.update.mockResolvedValue(record);

      await service.validateKey("crm_valid");

      const updateCall = prisma.apiKey.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe("key-1");
      expect(updateCall.data.lastUsedAt).toBeInstanceOf(Date);
    });

    it("does not throw on failure — returns null", async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.validateKey("crm_bad")).resolves.toBeNull();
    });
  });
});
