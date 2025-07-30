import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { SwapStatusDto } from "../../shared/dto/swap.dto";

export class FusionSwapParamsDto {
  @ApiProperty({
    description: "Source chain",
    enum: ["evm", "aptos"],
    example: "evm",
  })
  @IsEnum(["evm", "aptos"])
  readonly fromChain: "evm" | "aptos";

  @ApiProperty({
    description: "Destination chain",
    enum: ["evm", "aptos"],
    example: "aptos",
  })
  @IsEnum(["evm", "aptos"])
  readonly toChain: "evm" | "aptos";

  @ApiProperty({
    description: "Source token address",
    example: "0x1111111111111111111111111111111111111111",
  })
  @IsString()
  readonly fromTokenAddress: string;

  @ApiProperty({
    description: "Destination token address",
    example: "0x2222222222222222222222222222222222222222",
  })
  @IsString()
  readonly toTokenAddress: string;

  @ApiProperty({
    description: "Amount to swap with correct decimals",
    example: "1000000000000000000",
  })
  @IsString()
  readonly amount: string;

  @ApiProperty({
    description: "Recipient address",
    example: "0x3333333333333333333333333333333333333333",
  })
  @IsString()
  readonly recipient: string;

  @ApiProperty({
    description: "Timelock in seconds",
    example: 1800,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly timelock?: number;

  @ApiProperty({
    description: "Preimage for the hashlock",
    example:
      "0x4444444444444444444444444444444444444444444444444444444444444444",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly preimage?: string;
}

export class FusionSwapResultDto {
  @ApiProperty({
    description: "Success status of the swap",
    example: true,
  })
  @IsBoolean()
  readonly success: boolean;

  @ApiProperty({
    description: "Fusion order hash",
    example:
      "0x5555555555555555555555555555555555555555555555555555555555555555",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly orderHash?: string;

  @ApiProperty({
    description: "HTLC contract ID",
    example: "0x6666666666666666666666666666666666666666",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly htlcId?: string;

  @ApiProperty({
    description: "Hashlock used for the HTLC",
    example:
      "0x7777777777777777777777777777777777777777777777777777777777777777",
  })
  @IsString()
  readonly hashlock: string;

  @ApiProperty({
    description: "Preimage to unlock the HTLC",
    example:
      "0x8888888888888888888888888888888888888888888888888888888888888888",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly preimage?: string;

  @ApiProperty({
    description: "Timelock in seconds",
    example: 1800,
  })
  @IsNumber()
  readonly timelock: number;

  @ApiProperty({
    description: "Error message if any",
    example: "Transaction failed",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly error?: string;
}

export class MonitorSwapParamsDto {
  @ApiProperty({
    description: "Fusion order hash",
    example:
      "0x5555555555555555555555555555555555555555555555555555555555555555",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly orderHash?: string;

  @ApiProperty({
    description: "HTLC contract ID",
    example: "0x6666666666666666666666666666666666666666",
  })
  @IsString()
  readonly htlcId: string;

  @ApiProperty({
    description: "Chain where the HTLC is deployed",
    enum: ["evm", "aptos"],
    example: "evm",
  })
  @IsEnum(["evm", "aptos"])
  readonly chain: "evm" | "aptos";

  @ApiProperty({
    description: "Polling interval in milliseconds",
    example: 5000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly pollInterval?: number;

  @ApiProperty({
    description: "Maximum number of polling attempts",
    example: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly maxAttempts?: number;
}

export class CompleteSwapParamsDto {
  @ApiProperty({
    description: "Swap direction",
    enum: ["evm-to-aptos", "aptos-to-evm"],
    example: "evm-to-aptos",
  })
  @IsEnum(["evm-to-aptos", "aptos-to-evm"])
  readonly direction: "evm-to-aptos" | "aptos-to-evm";

  @ApiProperty({
    description: "Source token address",
    example: "0x1111111111111111111111111111111111111111",
  })
  @IsString()
  readonly fromTokenAddress: string;

  @ApiProperty({
    description: "Destination token address",
    example: "0x2222222222222222222222222222222222222222",
  })
  @IsString()
  readonly toTokenAddress: string;

  @ApiProperty({
    description: "Amount to swap",
    example: "1.0",
  })
  @IsString()
  readonly amount: string;

  @ApiProperty({
    description: "Token decimals",
    example: 18,
  })
  @IsNumber()
  readonly decimals: number;

  @ApiProperty({
    description: "Recipient address",
    example: "0x3333333333333333333333333333333333333333",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly recipient?: string;

  @ApiProperty({
    description: "Timelock in seconds",
    example: 1800,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly timelock?: number;
}

export class CompleteSwapResultDto {
  @ApiProperty({
    description: "Success status of the swap",
    example: true,
  })
  @IsBoolean()
  readonly success: boolean;

  @ApiProperty({
    description: "Swap direction",
    enum: ["evm-to-aptos", "aptos-to-evm"],
    example: "evm-to-aptos",
  })
  @IsEnum(["evm-to-aptos", "aptos-to-evm"])
  readonly direction: "evm-to-aptos" | "aptos-to-evm";

  @ApiProperty({
    description: "Fusion order hash",
    example:
      "0x5555555555555555555555555555555555555555555555555555555555555555",
  })
  @IsString()
  readonly orderHash: string;

  @ApiProperty({
    description: "HTLC contract ID",
    example: "0x6666666666666666666666666666666666666666",
  })
  @IsString()
  readonly htlcId: string;

  @ApiProperty({
    description: "Preimage to unlock the HTLC",
    example:
      "0x8888888888888888888888888888888888888888888888888888888888888888",
  })
  @IsString()
  readonly preimage: string;

  @ApiProperty({
    description: "Hashlock used for the HTLC",
    example:
      "0x7777777777777777777777777777777777777777777777777777777777777777",
  })
  @IsString()
  readonly hashlock: string;

  @ApiProperty({
    description: "Timelock in seconds",
    example: 1800,
  })
  @IsNumber()
  readonly timelock: number;

  @ApiProperty({
    description: "Error message if any",
    example: "Transaction failed",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly error?: string;
}

export class OrderStatusDto {
  @ApiProperty({ description: 'Order hash' })
  @IsString()
  readonly orderHash: string;

  @ApiProperty({ description: 'Order status' })
  @IsString()
  readonly status: string;

  @ApiProperty({ description: 'Amount of the order that has been filled' })
  @IsString()
  readonly filledAmount: string;

  @ApiProperty({ description: 'Remaining amount of the order to be filled' })
  @IsString()
  readonly remainingAmount: string;

  @ApiProperty({ description: 'Settlement details' })
  readonly settlement: {
    tx: string;
  };
}

export class MonitorOrderStatusDto {
    @ApiProperty({
    description: "Fusion order hash",
    example:
      "0x5555555555555555555555555555555555555555555555555555555555555555",
  })
  @IsString()
  readonly orderHash: string;

  @ApiProperty({
    description: "Chain where the order is placed",
    example: 1,
  })
  @IsNumber()
  readonly chainId: number;
}
