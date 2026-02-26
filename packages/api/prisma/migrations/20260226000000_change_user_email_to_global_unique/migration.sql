-- Drop composite unique index on (tenantId, email)
DROP INDEX "User_tenantId_email_key";

-- Create global unique index on email only
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
