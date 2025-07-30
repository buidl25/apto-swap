-- AlterEnum
ALTER TYPE "SwapStatus" ADD VALUE 'EVM_HTLC_CREATED';
ALTER TYPE "SwapStatus" ADD VALUE 'APTOS_HTLC_CREATED';
ALTER TYPE "SwapStatus" ADD VALUE 'USER_WITHDREW_APTOS';
ALTER TYPE "SwapStatus" ADD VALUE 'REFUNDED';
COMMIT;
-- This is an approximation of the migration that Prisma would generate.
-- The exact SQL might differ based on the database version and other factors.
-- Also, dropping enum values is a destructive action and requires more complex handling in production.
