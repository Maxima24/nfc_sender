-- AlterTable
ALTER TABLE "Topups" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "currency" SET DEFAULT 'NGN';
