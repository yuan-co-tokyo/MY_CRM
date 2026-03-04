-- CreateEnum
CREATE TYPE "CustomerCategory" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address" TEXT,
ADD COLUMN     "annualIncome" INTEGER,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "customerCategory" "CustomerCategory",
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "mobilePhone" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "workCompany" TEXT,
ADD COLUMN     "workEmail" TEXT,
ADD COLUMN     "workPhone" TEXT;
