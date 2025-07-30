import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class TokenRegisterDto {
  @ApiProperty({
    description: "Token name",
    example: "TestAptosToken",
  })
  @IsString()
  readonly tokenName: string;

  @ApiProperty({
    description: "Token symbol",
    example: "TAT",
  })
  @IsString()
  readonly tokenSymbol: string;

  @ApiProperty({
    description: "Token decimals",
    example: "8",
  })
  @IsString()
  readonly decimals: string;
}

export class TokenSetupDto {
  @ApiProperty({
    description: "Token address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken",
  })
  @IsString()
  readonly tokenAddress: string;
}

export class TokenMintDto {
  @ApiProperty({
    description: "Token address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken",
  })
  @IsString()
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Amount to mint",
    example: "1000000000",
  })
  @IsString()
  readonly amount: string;

  @ApiProperty({
    description: "Recipient address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly recipient?: string;
}

export class TokenBalanceDto {
  @ApiProperty({
    description: "Token address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken",
  })
  @IsString()
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Account address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly accountAddress?: string;
}

export class TokenBalanceResponseDto {
  @ApiProperty({
    description: "Token address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken",
  })
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Account address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
  })
  readonly accountAddress: string;

  @ApiProperty({
    description: "Token balance",
    example: "1000000000",
  })
  readonly balance: string;
}
