/*
  Warnings:

  - A unique constraint covering the columns `[virtualAccountNumber]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "virtualAccountNumber" TEXT,
ADD COLUMN     "virtualBankAccount" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_virtualAccountNumber_key" ON "Wallet"("virtualAccountNumber");
