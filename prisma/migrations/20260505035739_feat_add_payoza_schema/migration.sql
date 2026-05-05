/*
  Warnings:

  - You are about to drop the column `squadRef` on the `Topups` table. All the data in the column will be lost.
  - You are about to drop the column `customerIdentifier` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `virtualAccountNumber` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `virtualBankAccount` on the `Wallet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[payozaRef]` on the table `Topups` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `payozaRef` to the `Topups` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Topups_squadRef_key";

-- DropIndex
DROP INDEX "Wallet_customerIdentifier_key";

-- DropIndex
DROP INDEX "Wallet_virtualAccountNumber_key";

-- AlterTable
ALTER TABLE "Topups" DROP COLUMN "squadRef",
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "payozaRef" TEXT NOT NULL,
ADD COLUMN     "virtualAccountNumber" TEXT;

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "customerIdentifier",
DROP COLUMN "virtualAccountNumber",
DROP COLUMN "virtualBankAccount";

-- CreateIndex
CREATE UNIQUE INDEX "Topups_payozaRef_key" ON "Topups"("payozaRef");
