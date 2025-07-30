import { Module } from "@nestjs/common";
import { RecoveryService } from "./recovery.service";
import { PrismaModule } from "../prisma/prisma.module";
import { OneInchOrderMonitorModule } from "./one-inch-order-monitor.module";
import { AptosHtlcMonitorModule } from "./aptos-htlc-monitor.module";
import { EvmHtlcMonitorModule } from "./evm-htlc-monitor.module";

@Module({
  imports: [
    PrismaModule,
    OneInchOrderMonitorModule,
    AptosHtlcMonitorModule,
    EvmHtlcMonitorModule
  ],
  providers: [RecoveryService],
  exports: [RecoveryService],
})
export class RecoveryModule {}
