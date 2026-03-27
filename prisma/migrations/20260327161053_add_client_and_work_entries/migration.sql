-- CreateEnum
CREATE TYPE "WorkEntryStatus" AS ENUM ('UNBILLED', 'BILLED');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "defaultRate" DECIMAL(10,2),
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_entries" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "WorkEntryStatus" NOT NULL DEFAULT 'UNBILLED',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastInvoiceId" TEXT,
    "lastInvoiceNumber" TEXT,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_entries_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add clientId to invoices
ALTER TABLE "invoices" ADD COLUMN "clientId" TEXT;

-- AlterTable: Add workEntryId to invoice_line_items
ALTER TABLE "invoice_line_items" ADD COLUMN "workEntryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_name_key" ON "clients"("userId", "name");

-- CreateIndex
CREATE INDEX "clients_userId_idx" ON "clients"("userId");

-- CreateIndex
CREATE INDEX "work_entries_userId_clientId_status_idx" ON "work_entries"("userId", "clientId", "status");

-- CreateIndex
CREATE INDEX "work_entries_userId_date_idx" ON "work_entries"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_items_workEntryId_key" ON "invoice_line_items"("workEntryId");

-- CreateIndex
CREATE INDEX "invoice_line_items_workEntryId_idx" ON "invoice_line_items"("workEntryId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_workEntryId_fkey" FOREIGN KEY ("workEntryId") REFERENCES "work_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
