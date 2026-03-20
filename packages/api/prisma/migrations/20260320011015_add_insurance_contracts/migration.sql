-- CreateTable
CREATE TABLE "InsuranceContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "category" "InsuranceCategory" NOT NULL,
    "insuranceLineId" TEXT,
    "insuranceTypeId" TEXT,
    "insuranceCompanyId" TEXT,
    "petName" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "applicationDate" TIMESTAMP(3),
    "accountingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InsuranceContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsuranceContract_tenantId_idx" ON "InsuranceContract"("tenantId");

-- CreateIndex
CREATE INDEX "InsuranceContract_customerId_idx" ON "InsuranceContract"("customerId");

-- AddForeignKey
ALTER TABLE "InsuranceContract" ADD CONSTRAINT "InsuranceContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceContract" ADD CONSTRAINT "InsuranceContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceContract" ADD CONSTRAINT "InsuranceContract_insuranceLineId_fkey" FOREIGN KEY ("insuranceLineId") REFERENCES "InsuranceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceContract" ADD CONSTRAINT "InsuranceContract_insuranceTypeId_fkey" FOREIGN KEY ("insuranceTypeId") REFERENCES "InsuranceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceContract" ADD CONSTRAINT "InsuranceContract_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
