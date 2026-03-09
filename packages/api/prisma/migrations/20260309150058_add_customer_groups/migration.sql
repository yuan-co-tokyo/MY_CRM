-- AlterTable
ALTER TABLE "CorporateCustomer" ADD COLUMN     "parentCorporateId" TEXT;

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "postalCode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMembership" (
    "householdId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMembership_pkey" PRIMARY KEY ("householdId","customerId")
);

-- CreateTable
CREATE TABLE "CustomerEmployment" (
    "id" TEXT NOT NULL,
    "corporateCustomerId" TEXT NOT NULL,
    "individualCustomerId" TEXT NOT NULL,
    "jobTitle" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Household_tenantId_idx" ON "Household"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMembership_customerId_key" ON "HouseholdMembership"("customerId");

-- CreateIndex
CREATE INDEX "CustomerEmployment_corporateCustomerId_idx" ON "CustomerEmployment"("corporateCustomerId");

-- CreateIndex
CREATE INDEX "CustomerEmployment_individualCustomerId_idx" ON "CustomerEmployment"("individualCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerEmployment_corporateCustomerId_individualCustomerId_key" ON "CustomerEmployment"("corporateCustomerId", "individualCustomerId");

-- AddForeignKey
ALTER TABLE "CorporateCustomer" ADD CONSTRAINT "CorporateCustomer_parentCorporateId_fkey" FOREIGN KEY ("parentCorporateId") REFERENCES "CorporateCustomer"("customerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEmployment" ADD CONSTRAINT "CustomerEmployment_corporateCustomerId_fkey" FOREIGN KEY ("corporateCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEmployment" ADD CONSTRAINT "CustomerEmployment_individualCustomerId_fkey" FOREIGN KEY ("individualCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
