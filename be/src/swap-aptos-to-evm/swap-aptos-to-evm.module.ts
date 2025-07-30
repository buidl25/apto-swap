import { Module } from "@nestjs/common";
import { SwapAptosToEvmService } from "./swap-aptos-to-evm.service";
import { SwapAptosToEvmController } from "./swap-aptos-to-evm.controller";

@Module({
  providers: [SwapAptosToEvmService],
  controllers: [SwapAptosToEvmController],
})
export class SwapAptosToEvmModule {}
