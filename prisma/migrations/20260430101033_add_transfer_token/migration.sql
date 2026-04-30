/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `Transfer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token` to the `Transfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_token_key" ON "Transfer"("token");
