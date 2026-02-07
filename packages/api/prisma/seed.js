const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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
  }
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
