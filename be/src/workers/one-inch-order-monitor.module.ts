import { Module } from "@nestjs/common";
import { OneInchOrderMonitorService } from "./one-inch-order-monitor.service";
import { HttpModule } from "@nestjs/axios";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [OneInchOrderMonitorService],
  exports: [OneInchOrderMonitorService],
})
export class OneInchOrderMonitorModule { }
