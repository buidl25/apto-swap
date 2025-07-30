
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class HtlcStatusDto {
  @ApiProperty({
    description: 'Indicates if the HTLC exists',
    example: true,
  })
  @IsBoolean()
  readonly exists: boolean;

  @ApiProperty({
    description: 'Sender of the HTLC',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  readonly sender: string;

  @ApiProperty({
    description: 'Recipient of the HTLC',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  readonly recipient: string;

  @ApiProperty({
    description: 'Amount of the HTLC',
    example: '1000000000000000000',
  })
  @IsString()
  readonly amount: string;

  @ApiProperty({
    description: 'Hashlock of the HTLC',
    example: '0x1234567890123456789012345678901234567890123456789012345678901234',
  })
  @IsString()
  readonly hashlock: string;

  @ApiProperty({
    description: 'Timelock of the HTLC in seconds',
    example: 3600,
  })
  @IsNumber()
  readonly timelock: number;

  @ApiProperty({
    description: 'Indicates if the HTLC has been withdrawn',
    example: false,
  })
  @IsBoolean()
  readonly withdrawn: boolean;

  @ApiProperty({
    description: 'Indicates if the HTLC has been refunded',
    example: false,
  })
  @IsBoolean()
  readonly refunded: boolean;
}

export class SwapStatusDto {
  @ApiProperty({
    description: 'Swap ID',
    example: '0x1234567890123456789012345678901234567890123456789012345678901234',
  })
  @IsString()
  readonly swapId: string;

  @ApiProperty({
    description: 'Status of the swap',
    example: 'pending',
    enum: ['pending', 'completed', 'failed', 'cancelled'],
  })
  @IsString()
  readonly status: string;

  @ApiProperty({
    description: 'EVM HTLC contract address',
    example: '0x1234567890123456789012345678901234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly evmHtlcAddress?: string;

  @ApiProperty({
    description: 'Aptos HTLC resource address',
    example: '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly aptosHtlcAddress?: string;

  @ApiProperty({
    description: 'Hash lock used for the HTLC',
    example: '0x1234567890123456789012345678901234567890123456789012345678901234',
  })
  @IsString()
  readonly hashlock: string;

  @ApiProperty({
    description: 'Preimage for the hash lock (only available after completion)',
    example: '0x1234567890123456789012345678901234567890123456789012345678901234',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly preimage?: string;

  @ApiProperty({
    description: 'Timestamp when the swap was initiated',
    example: 1625097600,
  })
  @IsNumber()
  readonly timestamp: number;

  @ApiProperty({
    description: 'Order status information for Fusion swaps',
    required: false,
  })
  @IsOptional()
  readonly orderStatus?: {
    readonly status: string;
    readonly filledAmount?: string;
    readonly settlement?: { readonly tx: string };
  };

  @ApiProperty({
    description: 'HTLC status information',
    required: false,
  })
  @IsOptional()
  readonly htlcStatus?: HtlcStatusDto;
}
