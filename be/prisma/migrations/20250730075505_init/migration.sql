/*
  Warnings:

  - The values [CANCELLED] on the enum `SwapStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SwapStatus_new" AS ENUM ('PENDING', 'EVM_HTLC_CREATED', 'APTOS_HTLC_CREATED', 'USER_WITHDREW_APTOS', 'PREIMAGE_REVEALED', 'COMPLETED', 'FAILED', 'REFUNDED');
ALTER TABLE "swaps" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "swaps" ALTER COLUMN "status" TYPE "SwapStatus_new" USING ("status"::text::"SwapStatus_new");
ALTER TYPE "SwapStatus" RENAME TO "SwapStatus_old";
ALTER TYPE "SwapStatus_new" RENAME TO "SwapStatus";
DROP TYPE "SwapStatus_old";
ALTER TABLE "swaps" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
