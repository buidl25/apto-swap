import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsObject } from "class-validator";
import { SwapStatusDto } from "../../shared/dto/swap.dto";

export class InitiateSwapEvmToAptosDto {
  @ApiProperty({
    description: "Signed 1inch Fusion order",
    example: "{...}",
  })
  @IsObject()
  readonly signedOrder: Record<string, unknown>;

  @ApiProperty({
    description: "SHA-256 hash of the preimage",
    example: "0x...",
  })
  @IsString()
  readonly preimageHash: string;

  @ApiProperty({
    description: "Sender address (EVM address)",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly senderAddress: string;

  @ApiProperty({
    description: "Recipient address (Aptos address)",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
  })
  @IsString()
  readonly recipientAddress: string;

  @ApiProperty({
    description: "Source token address on EVM chain",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly fromTokenAddress: string;

  @ApiProperty({
    description: "Destination token address on Aptos chain",
    example: "0x1::aptos_coin::AptosCoin",
  })
  @IsString()
  readonly toTokenAddress: string;

  @ApiProperty({
    description: "Amount to swap",
    example: "1000000000000000000",
  })
  @IsString()
  readonly amount: string;
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
