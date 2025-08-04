import { Injectable, Logger } from "@nestjs/common";
import {
  InitiateSwapAptosToEvmDto,
  CompleteSwapDto,
  CancelSwapDto,
  SwapHistoryDto,
} from "./dto/swap-aptos-to-evm.dto";
import { SwapStatusDto } from "../shared/dto/swap.dto";
import { EscrowAptosDto } from "src/swap-evm-to-aptos/dto/swap-evm-to-aptos.dto";
@Injectable()
export class SwapAptosToEvmService {
  private readonly logger = new Logger(SwapAptosToEvmService.name);

  initiateSwap(
    initiateSwapDto: InitiateSwapAptosToEvmDto,
  ): Promise<SwapStatusDto> {
    this.logger.log("Initiating Aptos to EVM swap");
    return Promise.resolve({
      swapId: "aptos-to-evm-123456",
      status: "pending",
      aptosHtlcAddress:
        "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
      evmHtlcAddress: "0x1234567890123456789012345678901234567890",
      hashlock:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  getAptosEscrow(): Promise<any> {
    this.logger.log("Getting Aptos to EVM escrow");
    return Promise.resolve({
      aptosHtlcAddress:
        "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
      evmHtlcAddress: "0x1234567890123456789012345678901234567890",
      hashlock:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
    });
  }

  getSwapStatus(swapId: string): Promise<SwapStatusDto> {
    this.logger.log("Getting Aptos to EVM swap status");
    return Promise.resolve({
      swapId,
      status: "pending",
      aptosHtlcAddress:
        "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
      evmHtlcAddress: "0x1234567890123456789012345678901234567890",
      hashlock:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  completeSwap(completeSwapDto: CompleteSwapDto): Promise<SwapStatusDto> {
    this.logger.log("Completing Aptos to EVM swap");
    return Promise.resolve({
      swapId: completeSwapDto.swapId,
      status: "completed",
      aptosHtlcAddress:
        "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
      evmHtlcAddress: "0x1234567890123456789012345678901234567890",
      hashlock:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      preimage: completeSwapDto.preimage,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  cancelSwap(cancelSwapDto: CancelSwapDto): Promise<SwapStatusDto> {
    this.logger.log("Cancelling Aptos to EVM swap");
    return Promise.resolve({
      swapId: cancelSwapDto.swapId,
      status: "cancelled",
      aptosHtlcAddress:
        "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
      evmHtlcAddress: "0x1234567890123456789012345678901234567890",
      hashlock:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  getSwapHistory(): Promise<SwapHistoryDto> {
    this.logger.log("Getting Aptos to EVM swap history");
    return Promise.resolve({
      swaps: [
        {
          swapId: "aptos-to-evm-123456",
          status: "completed",
          aptosHtlcAddress:
            "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
          evmHtlcAddress: "0x1234567890123456789012345678901234567890",
          hashlock:
            "0x1234567890123456789012345678901234567890123456789012345678901234",
          preimage:
            "0x9876543210987654321098765432109876543210987654321098765432109876",
          timestamp: Math.floor(Date.now() / 1000),
        },
        {
          swapId: "aptos-to-evm-123455",
          status: "cancelled",
          aptosHtlcAddress:
            "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128",
          evmHtlcAddress: "0x1234567890123456789012345678901234567890",
          hashlock:
            "0x1234567890123456789012345678901234567890123456789012345678901234",
          timestamp: Math.floor((Date.now() - 86400000) / 1000),
        },
      ],
    });
  }
}
