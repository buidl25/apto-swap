import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SwapAptosToEvmService } from "./swap-aptos-to-evm.service";
import {
  InitiateSwapAptosToEvmDto,
  CompleteSwapDto,
  CancelSwapDto,
  SwapHistoryDto,
} from "./dto/swap-aptos-to-evm.dto";
import { SwapStatusDto } from "../shared/dto/swap.dto";
import { EscrowAptosDto } from "./dto/escrow.aptos.dto";

@ApiTags("swap-aptos-to-evm")
@Controller("swap-aptos-to-evm")
export class SwapAptosToEvmController {
  constructor(private readonly swapAptosToEvmService: SwapAptosToEvmService) { }

  @Post("initiate")
  @ApiOperation({ summary: "Initiate swap from Aptos to EVM" })
  @ApiResponse({
    status: 201,
    description: "Swap initiated successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  initiateSwap(@Body() initiateSwapDto: InitiateSwapAptosToEvmDto) {
    return this.swapAptosToEvmService.initiateSwap(initiateSwapDto);
  }

  @Get("status/:swapId")
  @ApiOperation({ summary: "Get status of Aptos to EVM swap" })
  @ApiResponse({
    status: 200,
    description: "Returns the swap status",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 404, description: "Swap not found" })
  getSwapStatus(@Param("swapId") swapId: string) {
    return this.swapAptosToEvmService.getSwapStatus(swapId);
  }

  @Post("complete")
  @ApiOperation({ summary: "Complete swap from Aptos to EVM" })
  @ApiResponse({
    status: 200,
    description: "Swap completed successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 404, description: "Swap not found" })
  completeSwap(@Body() completeSwapDto: CompleteSwapDto) {
    return this.swapAptosToEvmService.completeSwap(completeSwapDto);
  }

  @Post("cancel")
  @ApiOperation({ summary: "Cancel swap from Aptos to EVM" })
  @ApiResponse({
    status: 200,
    description: "Swap cancelled successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 404, description: "Swap not found" })
  cancelSwap(@Body() cancelSwapDto: CancelSwapDto) {
    return this.swapAptosToEvmService.cancelSwap(cancelSwapDto);
  }

  @Get("history")
  @ApiOperation({ summary: "Get history of Aptos to EVM swaps" })
  @ApiResponse({
    status: 200,
    description: "Returns swap history",
    type: SwapHistoryDto,
  })
  getSwapHistory() {
    return this.swapAptosToEvmService.getSwapHistory();
  }

  @Get("test-escrow")
  @ApiOperation({ summary: "Get escrow of Aptos to EVM swaps" })
  @ApiResponse({
    status: 200,
    description: "Returns escrow",
    type: EscrowAptosDto,
  })
  getEscrow() {
    return this.swapAptosToEvmService.getAptosEscrow();
  }
}
