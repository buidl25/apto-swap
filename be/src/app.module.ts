import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { DbModule } from "../prisma/src/db.module";
import { SampleWorkerModule } from "./workers/sample.worker.module";
import { ScheduleModule } from "@nestjs/schedule";
import { CacheModule } from "@nestjs/cache-manager";
import { SwapAptosToEvmModule } from "./swap-aptos-to-evm/swap-aptos-to-evm.module";
import { SwapEvmToAptosModule } from "./swap-evm-to-aptos/swap-evm-to-aptos.module";
import { EvmModule } from "./evm/evm.module";
import { AptosModule } from "./aptos/aptos.module";
import { FusionModule } from "./fusion/fusion.module";
import { OneInchOrderMonitorModule } from "./workers/one-inch-order-monitor.module";
import { AptosHtlcMonitorModule } from "./workers/aptos-htlc-monitor.module";
import { EvmHtlcMonitorModule } from "./workers/evm-htlc-monitor.module";
import { RefundHandlerModule } from "./workers/refund-handler.module";
import { RecoveryModule } from "./workers/recovery.module";
import { EscrowWorkerModule } from "./workers/escrow.worker.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.register({
      store: "memory",
      ttl: 50000,
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    SampleWorkerModule,
    OneInchOrderMonitorModule,
    AptosHtlcMonitorModule,
    EvmHtlcMonitorModule,
    SwapAptosToEvmModule,
    SwapEvmToAptosModule,
    EvmModule,
    AptosModule,
    FusionModule,
    RefundHandlerModule,
    RecoveryModule,
    EscrowWorkerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
