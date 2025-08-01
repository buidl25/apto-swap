-- CreateTable
CREATE TABLE "evm_order" (
    "id" TEXT NOT NULL,
    "direction" "SwapDirection" NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "sender" TEXT NOT NULL,
    "fromTokenAddress" TEXT NOT NULL,
    "toTokenAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "evmHtlcAddress" TEXT,
    "hashlock" TEXT NOT NULL,
    "orderHash" TEXT,
    "errorMessage" TEXT,
    "timelock" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "completedAt" INTEGER,
    "cancelledAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evm_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aptos_order" (
    "id" TEXT NOT NULL,
    "direction" "SwapDirection" NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "sender" TEXT NOT NULL,
    "fromTokenAddress" TEXT NOT NULL,
    "toTokenAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "aptosHtlcAddress" TEXT,
    "hashlock" TEXT NOT NULL,
    "orderHash" TEXT,
    "errorMessage" TEXT,
    "timelock" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "completedAt" INTEGER,
    "cancelledAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aptos_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evm_escrow" (
    "id" TEXT NOT NULL,
    "direction" "SwapDirection" NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "sender" TEXT NOT NULL,
    "fromTokenAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "evmHtlcAddress" TEXT,
    "hashlock" TEXT NOT NULL,
    "orderHash" TEXT,
    "errorMessage" TEXT,
    "timelock" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "completedAt" INTEGER,
    "cancelledAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evm_escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aptos_escrow" (
    "id" TEXT NOT NULL,
    "direction" "SwapDirection" NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "sender" TEXT NOT NULL,
    "fromTokenAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "aptosHtlcAddress" TEXT,
    "hashlock" TEXT NOT NULL,
    "orderHash" TEXT,
    "errorMessage" TEXT,
    "timelock" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "completedAt" INTEGER,
    "cancelledAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aptos_escrow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evm_order_sender_idx" ON "evm_order"("sender");

-- CreateIndex
CREATE INDEX "evm_order_status_idx" ON "evm_order"("status");

-- CreateIndex
CREATE INDEX "aptos_order_sender_idx" ON "aptos_order"("sender");

-- CreateIndex
CREATE INDEX "aptos_order_status_idx" ON "aptos_order"("status");

-- CreateIndex
CREATE INDEX "evm_escrow_sender_idx" ON "evm_escrow"("sender");

-- CreateIndex
CREATE INDEX "evm_escrow_status_idx" ON "evm_escrow"("status");

-- CreateIndex
CREATE INDEX "aptos_escrow_sender_idx" ON "aptos_escrow"("sender");

-- CreateIndex
CREATE INDEX "aptos_escrow_status_idx" ON "aptos_escrow"("status");
