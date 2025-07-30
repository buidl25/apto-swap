import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber } from "class-validator";

export class TokenDeployDto {
  @ApiProperty({
    description: "Token name",
    example: "Test EVM Token",
  })
  @IsString()
  readonly tokenName: string;

  @ApiProperty({
    description: "Token symbol",
    example: "TET",
  })
  @IsString()
  readonly tokenSymbol: string;

  @ApiProperty({
    description: "Initial supply",
    example: "1000000000000000000000",
  })
  @IsString()
  readonly initialSupply: string;

  @ApiProperty({
    description: "Decimals",
    example: 18,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly decimals?: number;
}

export class TokenBalanceDto {
  @ApiProperty({
    description: "Token address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @IsString()
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Account address",
    example: "0x1234567890123456789012345678901234567890",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly accountAddress?: string;
}

export class TokenDeployResponseDto {
  @ApiProperty({
    description: "Token address",
    example: "0x1234567890123456789012345678901234567890",
  })
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Transaction hash",
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  readonly transactionHash: string;

  @ApiProperty({
    description: "Token name",
    example: "Test EVM Token",
  })
  readonly tokenName: string;

  @ApiProperty({
    description: "Token symbol",
    example: "TET",
  })
  readonly tokenSymbol: string;
}

export class TokenBalanceResponseDto {
  @ApiProperty({
    description: "Token address",
    example: "0x1234567890123456789012345678901234567890",
  })
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Account address",
    example: "0x1234567890123456789012345678901234567890",
  })
  readonly accountAddress: string;

  @ApiProperty({
    description: "Balance",
    example: "1000000000000000000000",
  })
  readonly balance: string;
}
