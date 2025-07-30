import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsObject } from "class-validator";

export class ResolverDeployDto {
  @ApiProperty({
    description: "Fusion resolver name",
    example: "HTLCResolver",
  })
  @IsString()
  readonly resolverName: string;

  @ApiProperty({
    description: "HTLC contract address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly htlcAddress: string;
}

export class ResolverInteractDto {
  @ApiProperty({
    description: "Resolver address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly resolverAddress: string;

  @ApiProperty({
    description: "Method name",
    example: "resolveSwap",
  })
  @IsString()
  readonly method: string;

  @ApiProperty({
    description: "Method parameters",
    example: {
      swapId: "0x1234567890123456789012345678901234567890123456789012345678901234",
      preimage: "0x1234567890123456789012345678901234567890123456789012345678901234",
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  readonly params?: Record<string, unknown>;
}

export class ResolverResponseDto {
  @ApiProperty({
    description: "Resolver address",
    example: "0x1234567890123456789012345678901234567890",
  })
  readonly resolverAddress: string;

  @ApiProperty({
    description: "Transaction hash",
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  readonly transactionHash: string;

  @ApiProperty({
    description: "Status",
    example: "success",
  })
  readonly status: string;
}
