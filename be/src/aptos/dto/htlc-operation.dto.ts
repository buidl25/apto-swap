import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";

export class HtlcCreateDto {
  @ApiProperty({
    description: "Token address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken",
  })
  @IsString()
  readonly tokenAddress: string;

  @ApiProperty({
    description: "Amount to lock",
    example: "1000000000",
  })
  @IsString()
  readonly amount: string;

  @ApiProperty({
    description: "Recipient address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
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
    description: "HTLC address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
  })
  @IsString()
  readonly htlcAddress: string;

  @ApiProperty({
    description: "Preimage for the hash lock",
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
  })
  @IsString()
  readonly preimage: string;
}

export class HtlcRefundDto {
  @ApiProperty({
    description: "HTLC address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
  })
  @IsString()
  readonly htlcAddress: string;
}

export class HtlcEventsDto {
  @ApiProperty({
    description: "HTLC address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly htlcAddress?: string;
}

export class HtlcInitializeDto {
  @ApiProperty({
    description: "Module name",
    example: "aptos_htlc",
  })
  @IsString()
  readonly moduleName: string;
}

export class HtlcResponseDto {
  @ApiProperty({
    description: "HTLC address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
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

export class HtlcEventsResponseDto {
  @ApiProperty({
    description: "HTLC events",
    type: [Object],
  })
  readonly events: Record<string, unknown>[];
}
