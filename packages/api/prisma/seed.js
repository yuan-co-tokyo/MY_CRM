const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const SEED_SYSTEM_TENANT_NAME = "__system__";
const SEED_TENANT_NAME = process.env.SEED_TENANT_NAME || "テストテナント";
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

const SEED_TENANT2_NAME = "テストテナント2";
const SEED_ADMIN2_EMAIL = "admin2@example.com";

const SEED_SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL || "superadmin@example.com";
const SEED_SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || "SuperAdmin123!";

const ROLE_NAMES = {
  ADMIN: "ADMIN",
  PRIVILEGED: "PRIVILEGED",
  STANDARD: "STANDARD"
};

const PERMISSIONS = [
  // Customers
  { code: "customer.read", description: "Read customers" },
  { code: "customer.create", description: "Create customers" },
  { code: "customer.update", description: "Update customers" },
  { code: "customer.delete", description: "Delete customers" },

  // Interactions
  { code: "interaction.read", description: "Read interactions" },
  { code: "interaction.create", description: "Create interactions" },
  { code: "interaction.update", description: "Update interactions" },
  { code: "interaction.delete", description: "Delete interactions" },

  // Users
  { code: "user.read", description: "Read users" },
  { code: "user.create", description: "Create users" },
  { code: "user.update", description: "Update users" },
  { code: "user.delete", description: "Delete users" },

  // Groups
  { code: "group.read", description: "Read groups" },
  { code: "group.create", description: "Create groups" },
  { code: "group.update", description: "Update groups" },
  { code: "group.delete", description: "Delete groups" },

  // Roles & permissions
  { code: "role.read", description: "Read roles" },
  { code: "role.create", description: "Create roles" },
  { code: "role.update", description: "Update roles" },
  { code: "role.delete", description: "Delete roles" },
  { code: "permission.read", description: "Read permissions" },

  // Tenants (admin only)
  { code: "tenant.read", description: "Read tenant" },
  { code: "tenant.update", description: "Update tenant" },

  // Households
  { code: "household.read",   description: "Read households" },
  { code: "household.create", description: "Create households" },
  { code: "household.update", description: "Update households and members" },
  { code: "household.delete", description: "Delete households" },

  // Insurance applications
  { code: "application.read",   description: "Read insurance applications" },
  { code: "application.create", description: "Create insurance applications" },
  { code: "application.update", description: "Update insurance applications" },
  { code: "application.delete", description: "Delete insurance applications" }
];

const STANDARD_PERMISSION_CODES = new Set([
  "customer.create",
  "customer.read",
  "interaction.read",
  "interaction.create",
  "household.read",
  "application.read",
  "application.create"
]);

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission
    });
  }

  // Upsert __system__ tenant and SUPER_ADMIN user
  const systemTenant = await upsertTenant(SEED_SYSTEM_TENANT_NAME);
  await upsertSuperAdminUser(systemTenant.id);

  const seedTenant = await upsertTenant(SEED_TENANT_NAME);
  const seedTenant2 = await upsertTenant(SEED_TENANT2_NAME);

  // Exclude __system__ tenant from role seeding loop
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null, name: { not: SEED_SYSTEM_TENANT_NAME } },
    select: { id: true }
  });

  if (tenants.length === 0) {
    console.log("No tenants found. Skipping role seeding.");
    return;
  }

  const permissions = await prisma.permission.findMany({
    select: { id: true, code: true }
  });

  const allPermissionIds = permissions.map((permission) => permission.id);
  const standardPermissionIds = permissions
    .filter((permission) => STANDARD_PERMISSION_CODES.has(permission.code))
    .map((permission) => permission.id);

  for (const tenant of tenants) {
    const adminRole = await upsertRole(tenant.id, ROLE_NAMES.ADMIN);
    const privilegedRole = await upsertRole(tenant.id, ROLE_NAMES.PRIVILEGED);
    const standardRole = await upsertRole(tenant.id, ROLE_NAMES.STANDARD);

    await assignRolePermissions(adminRole.id, allPermissionIds);
    await assignRolePermissions(privilegedRole.id, allPermissionIds);
    await assignRolePermissions(standardRole.id, standardPermissionIds);

    if (tenant.id === seedTenant.id) {
      await upsertAdminUser(seedTenant.id, adminRole.id, SEED_ADMIN_EMAIL, "Admin");
    } else if (tenant.id === seedTenant2.id) {
      await upsertAdminUser(seedTenant2.id, adminRole.id, SEED_ADMIN2_EMAIL, "Admin2");
    }
  }
}

async function upsertTenant(name) {
  const existing = await prisma.tenant.findFirst({
    where: { name, deletedAt: null }
  });

  if (existing) {
    return prisma.tenant.update({
      where: { id: existing.id },
      data: { deletedAt: null }
    });
  }

  return prisma.tenant.create({
    data: { name }
  });
}

async function upsertSuperAdminUser(tenantId) {
  const passwordHash = await bcrypt.hash(SEED_SUPER_ADMIN_PASSWORD, 12);

  const existing = await prisma.user.findFirst({
    where: { email: SEED_SUPER_ADMIN_EMAIL }
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        tenantId,
        email: SEED_SUPER_ADMIN_EMAIL,
        passwordHash,
        name: "Super Admin",
        status: "ACTIVE",
        userType: "SUPER_ADMIN"
      }
    });
  }
}

async function upsertAdminUser(tenantId, adminRoleId, email, name) {
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

  const existingUser = await prisma.user.findFirst({
    where: { tenantId, email }
  });

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        name,
        status: "ACTIVE",
        userType: "ADMIN"
      }
    }));

  await prisma.userRole.createMany({
    data: [{ userId: user.id, roleId: adminRoleId }],
    skipDuplicates: true
  });
}

async function upsertRole(tenantId, name) {
  const existing = await prisma.role.findFirst({
    where: { tenantId, name }
  });

  if (existing) {
    return prisma.role.update({
      where: { id: existing.id },
      data: { deletedAt: null }
    });
  }

  return prisma.role.create({
    data: { tenantId, name }
  });
}

async function assignRolePermissions(roleId, permissionIds) {
  if (permissionIds.length === 0) {
    return;
  }

  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId,
      permissionId
    })),
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded permissions:", PERMISSIONS.length);
    console.log("Seeded roles for existing tenants.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
