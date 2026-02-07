const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded permissions:", PERMISSIONS.length);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
