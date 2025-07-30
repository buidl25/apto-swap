import { Module } from "@nestjs/common";
import { FusionService } from "./fusion.service";
import { FusionController } from "./fusion.controller";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [HttpModule],
  providers: [FusionService],
  controllers: [FusionController],
  exports: [FusionService],
})
export class FusionModule {}
