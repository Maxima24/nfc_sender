/*
  Warnings:

  - A unique constraint covering the columns `[deviceId]` on the table `Device` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "isActive" BOOLEAN,
ALTER COLUMN "deviceId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceId_key" ON "Device"("deviceId");
