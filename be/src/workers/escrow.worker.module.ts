import { Module } from "@nestjs/common";
import { EscrowWorkerService } from "./escrow.worker.service";
import { AptosModule } from "src/aptos/aptos.module";
import { EvmModule } from "src/evm/evm.module";
import { DbModule } from "prisma/src/db.module";

@Module({
    imports: [DbModule, AptosModule, EvmModule],
    providers: [EscrowWorkerService],
    exports: [EscrowWorkerService],
})
export class EscrowWorkerModule { }
