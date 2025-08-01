import { Module } from "@nestjs/common";
import { SwapEvmToAptosService } from "./swap-evm-to-aptos.service";
import { SwapEvmToAptosController } from "./swap-evm-to-aptos.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { FusionModule } from "../fusion/fusion.module";
import { AptosModule } from "../aptos/aptos.module";
import { EvmModule } from "../evm/evm.module";

@Module({
  imports: [PrismaModule, FusionModule, AptosModule, EvmModule],
  providers: [SwapEvmToAptosService],
  controllers: [SwapEvmToAptosController],
})
export class SwapEvmToAptosModule { }
