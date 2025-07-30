import { Module } from "@nestjs/common";
import { AptosService } from "./aptos.service";
import { AptosController } from "./aptos.controller";
import { AptosHtlcMonitorModule } from '../workers/aptos-htlc-monitor.module';

@Module({
  imports: [AptosHtlcMonitorModule],
  providers: [AptosService],
  controllers: [AptosController],
  exports: [AptosService],
})
export class AptosModule {}
