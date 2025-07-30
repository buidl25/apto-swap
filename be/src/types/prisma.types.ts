import { Prisma } from "@prisma/client";

/**
 * Type definitions for Prisma models and operations
 */

/**
 * Swap model type from Prisma schema
 */
export type Swap = {
  id: string;
  direction: SwapDirection;
  status: SwapStatus;
  sender: string;
  recipient: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  evmHtlcAddress: string | null;
  aptosHtlcAddress: string | null;
  hashlock: string;
  preimage: string | null;
  timelock: number;
  timestamp: number;
  completedAt: number | null;
  cancelledAt: number | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Swap status enum from Prisma schema
 */
export enum SwapStatus {
  PENDING = "PENDING",
  EVM_HTLC_CREATED = "EVM_HTLC_CREATED",
  APTOS_HTLC_CREATED = "APTOS_HTLC_CREATED",
  USER_WITHDREW_APTOS = "USER_WITHDREW_APTOS",
  PREIMAGE_REVEALED = "PREIMAGE_REVEALED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

/**
 * Swap direction enum from Prisma schema
 */
export enum SwapDirection {
  EVM_TO_APTOS = "EVM_TO_APTOS",
  APTOS_TO_EVM = "APTOS_TO_EVM",
}

/**
 * Swap where input type for Prisma queries
 */
export type SwapWhereInput = Prisma.SwapWhereInput;

/**
 * Swap update input type for Prisma queries
 */
export type SwapUpdateInput = Prisma.SwapUpdateInput;

/**
 * Type for Prisma EnumSwapStatusFieldUpdateOperationsInput
 */
export type EnumSwapStatusFieldUpdateOperationsInput = {
  set?: SwapStatus;
};
