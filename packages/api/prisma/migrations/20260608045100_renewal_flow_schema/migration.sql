-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'RENEWED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'PROPOSED', 'SUBMITTED', 'APPROVED', 'CONVERTED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "InsuranceApplication" ADD COLUMN     "renewalSourceContractId" TEXT,
ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "InsuranceContract" ADD COLUMN     "previousContractId" TEXT,
ADD COLUMN     "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE';

-- Initialize existing data
UPDATE "InsuranceContract" SET "status" = 'ACTIVE';
UPDATE "InsuranceApplication" SET "status" = 'CONVERTED';

-- CreateIndex
CREATE INDEX "InsuranceApplication_renewalSourceContractId_idx" ON "InsuranceApplication"("renewalSourceContractId");

-- CreateIndex
CREATE INDEX "InsuranceContract_previousContractId_idx" ON "InsuranceContract"("previousContractId");

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_renewalSourceContractId_fkey" FOREIGN KEY ("renewalSourceContractId") REFERENCES "InsuranceContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceContract" ADD CONSTRAINT "InsuranceContract_previousContractId_fkey" FOREIGN KEY ("previousContractId") REFERENCES "InsuranceContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
