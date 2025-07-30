import { Module } from '@nestjs/common';
import { RefundHandlerService } from './refund-handler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EvmModule } from '../evm/evm.module';
import { AptosModule } from '../aptos/aptos.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    EvmModule,
    AptosModule,
    ScheduleModule.forRoot(),
  ],
  providers: [RefundHandlerService],
  exports: [RefundHandlerService],
})
export class RefundHandlerModule {}
