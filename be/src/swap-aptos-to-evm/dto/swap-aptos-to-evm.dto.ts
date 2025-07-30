import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, IsBoolean } from "class-validator";
import { SwapStatusDto } from "../../shared/dto/swap.dto";

export class InitiateSwapAptosToEvmDto {
  @ApiProperty({
    description: "Aptos token address to swap from",
    example:
      "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken",
  })
  @IsString()
  readonly fromTokenAddress: string;

  @ApiProperty({
    description: "EVM token address to swap to",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly toTokenAddress: string;

  @ApiProperty({
    description: "Amount to swap",
    example: "1000000000",
  })
  @IsString()
  readonly amount: string;

  @ApiProperty({
    description: "Recipient address on EVM",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly recipient: string;

  @ApiProperty({
    description: "Timelock in seconds",
    example: 3600,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly timelock?: number;
}

export class CompleteSwapDto {
  @ApiProperty({
    description: "Swap ID to complete",
    example:
      "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  @IsString()
  readonly swapId: string;

  @ApiProperty({
    description: "Preimage to unlock the HTLC",
    example:
      "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  @IsString()
  readonly preimage: string;
}

export class CancelSwapDto {
  @ApiProperty({
    description: "Swap ID to cancel",
    example:
      "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  @IsString()
  readonly swapId: string;
}

export class SwapHistoryDto {
  @ApiProperty({
    description: "List of all swaps",
    type: [SwapStatusDto],
  })
  readonly swaps: SwapStatusDto[];
}
