import { Module } from "@nestjs/common";
import { SampleWorkerService } from "./sample.worker.service";

@Module({
  imports: [],
  providers: [SampleWorkerService],
  exports: [SampleWorkerService],
})
export class SampleWorkerModule {}
