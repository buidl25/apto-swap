import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EvmHtlcMonitorService } from "./evm-htlc-monitor.service";
import { EvmPreimageHandlerService } from "./evm-preimage-handler.service";
import { EvmModule } from "../evm/evm.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AptosModule } from "../aptos/aptos.module";

/**
 * Module for EVM HTLC monitoring
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    EvmModule,
    PrismaModule,
    AptosModule,
  ],
  providers: [
    EvmHtlcMonitorService,
    EvmPreimageHandlerService,
  ],
  exports: [
    EvmHtlcMonitorService,
  ],
})
export class EvmHtlcMonitorModule {}
