import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AptosAddressDto {
  @ApiProperty({
    description: "Aptos account address",
    example: "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
  })
  @IsString()
  readonly address: string;
}
