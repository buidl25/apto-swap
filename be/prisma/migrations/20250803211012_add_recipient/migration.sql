-- AlterTable
ALTER TABLE "aptos_escrow" ADD COLUMN     "recipient" TEXT;

-- AlterTable
ALTER TABLE "evm_escrow" ADD COLUMN     "recipient" TEXT;
