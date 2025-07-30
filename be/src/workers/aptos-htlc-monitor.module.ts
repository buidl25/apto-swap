import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AptosHtlcMonitorService } from "./aptos-htlc-monitor.service";
import { AptosPreimageHandlerService } from "./aptos-preimage-handler.service";
import { EvmModule } from "../evm/evm.module";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * Module for Aptos HTLC monitoring and preimage handling
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    EvmModule,
    PrismaModule,
  ],
  providers: [
    AptosHtlcMonitorService,
    AptosPreimageHandlerService,
  ],
  exports: [
    AptosHtlcMonitorService,
  ],
})
export class AptosHtlcMonitorModule {}
