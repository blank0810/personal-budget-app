-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "taxId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyEmail" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyPhone" TEXT,
ADD COLUMN     "companyTaxId" TEXT,
ALTER COLUMN "clientName" DROP NOT NULL;
