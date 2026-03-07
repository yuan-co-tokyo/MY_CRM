-- Phase 1: Create new sub-tables (before dropping columns so data can be migrated)

-- CreateTable IndividualCustomer
CREATE TABLE "IndividualCustomer" (
    "customerId"   TEXT NOT NULL,
    "gender"       "Gender",
    "birthDate"    TIMESTAMP(3),
    "mobilePhone"  TEXT,
    "workCompany"  TEXT,
    "workPhone"    TEXT,
    "workEmail"    TEXT,
    "annualIncome" INTEGER,

    CONSTRAINT "IndividualCustomer_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable CorporateCustomer
CREATE TABLE "CorporateCustomer" (
    "customerId" TEXT NOT NULL,

    CONSTRAINT "CorporateCustomer_pkey" PRIMARY KEY ("customerId")
);

-- Phase 2: Migrate existing data from Customer into sub-tables

-- Migrate individual-specific data: customers with INDIVIDUAL category
-- OR with any non-null individual field (safety net for null-category rows with data)
INSERT INTO "IndividualCustomer" (
    "customerId", "gender", "birthDate", "mobilePhone",
    "workCompany", "workPhone", "workEmail", "annualIncome"
)
SELECT
    "id",
    "gender",
    "birthDate",
    "mobilePhone",
    "workCompany",
    "workPhone",
    "workEmail",
    "annualIncome"
FROM "Customer"
WHERE "customerCategory" = 'INDIVIDUAL'
   OR "gender"       IS NOT NULL
   OR "birthDate"    IS NOT NULL
   OR "mobilePhone"  IS NOT NULL
   OR "workCompany"  IS NOT NULL
   OR "workPhone"    IS NOT NULL
   OR "workEmail"    IS NOT NULL
   OR "annualIncome" IS NOT NULL;

-- Migrate corporate data
INSERT INTO "CorporateCustomer" ("customerId")
SELECT "id"
FROM "Customer"
WHERE "customerCategory" = 'CORPORATE';

-- Phase 3: Add foreign key constraints

ALTER TABLE "IndividualCustomer"
    ADD CONSTRAINT "IndividualCustomer_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CorporateCustomer"
    ADD CONSTRAINT "CorporateCustomer_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 4: Drop migrated columns from Customer table

ALTER TABLE "Customer"
    DROP COLUMN "gender",
    DROP COLUMN "birthDate",
    DROP COLUMN "mobilePhone",
    DROP COLUMN "workCompany",
    DROP COLUMN "workPhone",
    DROP COLUMN "workEmail",
    DROP COLUMN "annualIncome";
