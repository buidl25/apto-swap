import { Module } from "@nestjs/common";
import { EscrowWorkerService } from "./escrow.worker.service";

@Module({
    imports: [],
    providers: [EscrowWorkerService],
    exports: [EscrowWorkerService],
})
export class EscrowWorkerModule { }
