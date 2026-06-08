import { ExecutionContext, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ApiKeyGuard } from "../guards/api-key.guard";
import { ApiKeysService } from "../../api-keys/api-keys.service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function mockCustomer(id: string, tenantId: string) {
  return {
    id,
    tenantId,
    name: "Test Customer",
    email: "test@example.com",
    phone: null,
    status: "LEAD",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

// ── ApiKeyGuard unit tests ───────────────────────────────────────────────────

describe("ApiKeyGuard", () => {
  function makeGuard(validateKeyImpl: (k: string) => any) {
    const svc = { validateKey: jest.fn().mockImplementation(validateKeyImpl) } as unknown as ApiKeysService;
    return { guard: new ApiKeyGuard(svc), svc };
  }

  function makeContext(headers: Record<string, string | undefined>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  it("valid API key → canActivate returns true, injects apiKeyContext", async () => {
    const { guard } = makeGuard(() => ({ tenantId: TENANT_A, apiKeyId: "key-1" }));
    const req: any = { headers: { "x-api-key": "valid-key" } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.apiKeyContext).toEqual({ tenantId: TENANT_A, apiKeyId: "key-1" });
  });

  it("missing API key → UnauthorizedException", async () => {
    const { guard } = makeGuard(() => null);
    const ctx = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("invalid key (not found) → 401", async () => {
    const { guard } = makeGuard(() => null);
    const ctx = makeContext({ "x-api-key": "bad-key" });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("revoked key → 401 (validateKey returns null for revoked keys)", async () => {
    const { guard } = makeGuard(() => null);
    const ctx = makeContext({ "x-api-key": "revoked-key" });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("expired key → 401 (validateKey returns null for expired keys)", async () => {
    const { guard } = makeGuard(() => null);
    const ctx = makeContext({ "x-api-key": "expired-key" });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

// ── PublicCustomersController unit tests ─────────────────────────────────────

import { PublicCustomersController } from "./public-customers.controller";
import { PublicCustomersService } from "./public-customers.service";

function makeController(serviceImpl: Partial<PublicCustomersService>) {
  const svc = serviceImpl as PublicCustomersService;
  return new PublicCustomersController(svc);
}

function makeReq(tenantId: string) {
  return { apiKeyContext: { tenantId } } as any;
}

describe("PublicCustomersController", () => {
  it("tenant B key only sees tenant B data (tenant isolation)", async () => {
    const svc = {
      list: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    } as unknown as PublicCustomersService;
    const ctrl = makeController(svc);

    const result = await ctrl.list(makeReq(TENANT_B));

    expect(result.data).toHaveLength(0);
    // Verify service was called with tenant B, not tenant A
    expect(svc.list).toHaveBeenCalledWith(TENANT_B, 1, 20);
  });

  it("CRUD: create → get → update → list", async () => {
    const customer = mockCustomer("c1", TENANT_A);
    const svc = {
      create: jest.fn().mockResolvedValue(customer),
      get: jest.fn().mockResolvedValue(customer),
      update: jest.fn().mockResolvedValue({ ...customer, name: "Updated" }),
      list: jest.fn().mockResolvedValue({ data: [customer], total: 1 }),
    } as unknown as PublicCustomersService;
    const ctrl = makeController(svc);
    const req = makeReq(TENANT_A);

    const created = await ctrl.create(req, { name: "Test Customer", email: "test@example.com" });
    expect(created.name).toBe("Test Customer");
    expect(svc.create).toHaveBeenCalledWith(TENANT_A, { name: "Test Customer", email: "test@example.com" });

    const got = await ctrl.get(req, "c1");
    expect(got.id).toBe("c1");
    expect(svc.get).toHaveBeenCalledWith(TENANT_A, "c1");

    const updated = await ctrl.update(req, "c1", { name: "Updated" });
    expect(updated.name).toBe("Updated");
    expect(svc.update).toHaveBeenCalledWith(TENANT_A, "c1", { name: "Updated" });

    const listed = await ctrl.list(req);
    expect(listed.total).toBe(1);
    expect(listed.data).toHaveLength(1);
    expect(listed.page).toBe(1);
    expect(listed.limit).toBe(20);
  });

  it("get non-existent customer → NotFoundException propagates", async () => {
    const svc = {
      get: jest.fn().mockRejectedValue(new NotFoundException("Customer not found")),
    } as unknown as PublicCustomersService;
    const ctrl = makeController(svc);

    await expect(ctrl.get(makeReq(TENANT_A), "nonexistent")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("update from other tenant → NotFoundException propagates (tenantId always in where clause)", async () => {
    const svc = {
      update: jest.fn().mockRejectedValue(new NotFoundException("Customer not found")),
    } as unknown as PublicCustomersService;
    const ctrl = makeController(svc);

    await expect(ctrl.update(makeReq(TENANT_B), "c1-belongs-to-A", { name: "Hacked" })).rejects.toBeInstanceOf(NotFoundException);
    expect(svc.update).toHaveBeenCalledWith(TENANT_B, "c1-belongs-to-A", { name: "Hacked" });
  });
});
