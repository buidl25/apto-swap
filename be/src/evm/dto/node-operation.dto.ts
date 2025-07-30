import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber } from "class-validator";

export class NodeStartDto {
  @ApiProperty({
    description: "Chain ID",
    example: 31337,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly chainId?: number;

  @ApiProperty({
    description: "RPC port",
    example: 8545,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly port?: number;
}

export class NodeResponseDto {
  @ApiProperty({
    description: "Node status",
    example: "running",
  })
  readonly status: string;

  @ApiProperty({
    description: "RPC URL",
    example: "http://localhost:8545",
  })
  readonly rpcUrl: string;

  @ApiProperty({
    description: "Chain ID",
    example: 31337,
  })
  readonly chainId: number;
}
