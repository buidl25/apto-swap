import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SwapEvmToAptosService } from "./swap-evm-to-aptos.service";
import {
  InitiateSwapEvmToAptosDto,
  CompleteSwapDto,
  CancelSwapDto,
  SwapHistoryDto,
  EscrowEvmDto,
  EscrowAptosDto,
} from "./dto/swap-evm-to-aptos.dto";
import { SwapStatusDto } from "../shared/dto/swap.dto";

@ApiTags("swap-evm-to-aptos")
@Controller("swap-evm-to-aptos")
export class SwapEvmToAptosController {
  constructor(private readonly swapEvmToAptosService: SwapEvmToAptosService) { }

  @Post("initiate")
  @ApiOperation({ summary: "Initiate swap from EVM to Aptos" })
  @ApiResponse({
    status: 201,
    description: "Swap initiated successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  initiateSwap(@Body() initiateSwapDto: InitiateSwapEvmToAptosDto) {
    return this.swapEvmToAptosService.initiateSwap(initiateSwapDto);
  }

  @Get("test-escrow-ewm")
  @ApiOperation({ summary: "Test swap with specific status" })
  @ApiResponse({
    status: 200,
    description: "Test swap executed successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid test parameters" })
  runTestEscrowEvm(@Query() testSwapDto: EscrowEvmDto) {
    return this.swapEvmToAptosService.runTestEscrowEvm(testSwapDto);
  }

  @Get("test-escrow-aptos")
  @ApiOperation({ summary: "Test swap with specific status" })
  @ApiResponse({
    status: 200,
    description: "Test swap executed successfully",
    type: EscrowAptosDto,
  })
  @ApiResponse({ status: 400, description: "Invalid test parameters" })
  runTestSwap(@Query() testSwapDto: EscrowAptosDto) {
    return this.swapEvmToAptosService.runTestEscrowAptos(testSwapDto);
  }

  @Get("status/:swapId")
  @ApiOperation({ summary: "Get status of EVM to Aptos swap" })
  @ApiResponse({
    status: 200,
    description: "Returns the swap status",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 404, description: "Swap not found" })
  getSwapStatus(@Param("swapId") swapId: string) {
    return this.swapEvmToAptosService.getSwapStatus(swapId);
  }

  @Post("complete")
  @ApiOperation({ summary: "Complete swap from EVM to Aptos" })
  @ApiResponse({
    status: 200,
    description: "Swap completed successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 404, description: "Swap not found" })
  completeSwap(@Body() completeSwapDto: CompleteSwapDto) {
    return this.swapEvmToAptosService.completeSwap(completeSwapDto);
  }

  @Post("cancel")
  @ApiOperation({ summary: "Cancel swap from EVM to Aptos" })
  @ApiResponse({
    status: 200,
    description: "Swap cancelled successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 404, description: "Swap not found" })
  cancelSwap(@Body() cancelSwapDto: CancelSwapDto) {
    return this.swapEvmToAptosService.cancelSwap(cancelSwapDto);
  }

  @Get("history")
  @ApiOperation({ summary: "Get history of EVM to Aptos swaps" })
  @ApiResponse({
    status: 200,
    description: "Returns swap history",
    type: SwapHistoryDto,
  })
  getSwapHistory() {
    return this.swapEvmToAptosService.getSwapHistory();
  }
}
