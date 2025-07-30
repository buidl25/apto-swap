/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SwapDirection" AS ENUM ('EVM_TO_APTOS', 'APTOS_TO_EVM');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "swaps" (
    "id" TEXT NOT NULL,
    "direction" "SwapDirection" NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "sender" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "fromTokenAddress" TEXT NOT NULL,
    "toTokenAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "evmHtlcAddress" TEXT,
    "aptosHtlcAddress" TEXT,
    "hashlock" TEXT NOT NULL,
    "preimage" TEXT,
    "timelock" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "completedAt" INTEGER,
    "cancelledAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "swaps_sender_idx" ON "swaps"("sender");

-- CreateIndex
CREATE INDEX "swaps_recipient_idx" ON "swaps"("recipient");

-- CreateIndex
CREATE INDEX "swaps_status_idx" ON "swaps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");
