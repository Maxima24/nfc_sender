/*
  Warnings:

  - A unique constraint covering the columns `[customerIdentifier]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Transfer" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_customerIdentifier_key" ON "Wallet"("customerIdentifier");
