-- AlterTable: add currency to clients
ALTER TABLE "clients" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- Backfill existing clients with their user's currency
UPDATE "clients" c SET "currency" = (SELECT u."currency" FROM "users" u WHERE u.id = c."userId");

-- AlterTable: add currency to invoices
ALTER TABLE "invoices" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- Backfill existing invoices with their user's currency
UPDATE "invoices" i SET "currency" = (SELECT u."currency" FROM "users" u WHERE u.id = i."userId");
