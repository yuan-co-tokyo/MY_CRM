const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const SEED_TENANT_NAME = process.env.SEED_TENANT_NAME || "テストテナント";
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

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
  { code: "tenant.update", description: "Update tenant" }
];

const STANDARD_PERMISSION_CODES = new Set([
  "customer.read",
  "interaction.read",
  "interaction.create"
]);

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission
    });
  }

  const seedTenant = await upsertTenant(SEED_TENANT_NAME);
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
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
      await upsertAdminUser(seedTenant.id, adminRole.id);
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

async function upsertAdminUser(tenantId, adminRoleId) {
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

  const existingUser = await prisma.user.findFirst({
    where: { tenantId, email: SEED_ADMIN_EMAIL }
  });

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        tenantId,
        email: SEED_ADMIN_EMAIL,
        passwordHash,
        name: "Admin",
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
