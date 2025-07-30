import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";

export class HtlcDeployDto {
  @ApiProperty({
    description: "Token address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly tokenAddress: string;
}

export class HtlcCreateDto {
  @ApiProperty({
    description: "HTLC contract address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly htlcAddress: string;

  @ApiProperty({
    description: "Token address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Amount to lock",
    example: "1000000000000000000",
  })
  @IsString()
  readonly amount: string;

  @ApiProperty({
    description: "Recipient address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly recipient: string;

  @ApiProperty({
    description: "Hash lock",
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  @IsString()
  readonly hashlock: string;

  @ApiProperty({
    description: "Timelock in seconds",
    example: 3600,
  })
  @IsNumber()
  readonly timelock: number;
}

export class HtlcWithdrawDto {
  @ApiProperty({
    description: "HTLC contract address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly htlcAddress: string;

  @ApiProperty({
    description: "Swap ID",
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  @IsString()
  readonly swapId: string;

  @ApiProperty({
    description: "Preimage for the hash lock",
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  @IsString()
  readonly preimage: string;
}

export class HtlcResponseDto {
  @ApiProperty({
    description: "HTLC contract address",
    example: "0x1234567890123456789012345678901234567890",
  })
  readonly htlcAddress: string;

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

export class HtlcCreateResponseDto extends HtlcResponseDto {
  @ApiProperty({
    description: "Swap ID",
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  readonly swapId: string;
}
