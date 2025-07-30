import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { FusionService } from "./fusion.service";
import {
  FusionSwapParamsDto,
  FusionSwapResultDto,
  MonitorSwapParamsDto,
  CompleteSwapParamsDto,
  CompleteSwapResultDto,
  MonitorOrderStatusDto,
  OrderStatusDto,
} from "./dto/fusion-swap.dto";
import { SwapStatusDto } from "../shared/dto/swap.dto";

@ApiTags("fusion")
@Controller("fusion")
export class FusionController {
  constructor(private readonly fusionService: FusionService) {}

  @Post("htlc-swap/initiate")
  @ApiOperation({ summary: "Initiate a Fusion HTLC cross-chain swap" })
  @ApiResponse({
    status: 201,
    description: "Swap initiated successfully",
    type: FusionSwapResultDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  initiateFusionSwap(
    @Body() params: FusionSwapParamsDto,
  ): Promise<FusionSwapResultDto> {
    return this.fusionService.initiateFusionSwap(params);
  }

  @Post("htlc-swap/complete")
  @ApiOperation({ summary: "Complete a Fusion HTLC cross-chain swap" })
  @ApiResponse({
    status: 200,
    description: "Swap completed successfully",
    type: FusionSwapResultDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  completeFusionSwap(
    @Body()
    params: {
      orderHash: string;
      htlcId: string;
      preimage: string;
      chain: "evm" | "aptos";
    },
  ): Promise<FusionSwapResultDto> {
    return this.fusionService.completeFusionSwap(
      params.orderHash,
      params.htlcId,
      params.preimage,
      params.chain,
    );
  }

  @Post("monitor-swap")
  @ApiOperation({ summary: "Monitor the status of a cross-chain swap" })
  @ApiResponse({
    status: 200,
    description: "Swap status retrieved successfully",
    type: [SwapStatusDto],
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  monitorSwap(@Body() params: MonitorSwapParamsDto): Promise<SwapStatusDto[]> {
    return this.fusionService.monitorSwap(params);
  }

  @Get("swap-status/:htlcId/:chain")
  @ApiOperation({ summary: "Get the current status of a cross-chain swap" })
  @ApiResponse({
    status: 200,
    description: "Swap status retrieved successfully",
    type: SwapStatusDto,
  })
  @ApiResponse({ status: 404, description: "Swap not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  getSwapStatus(
    @Param("htlcId") htlcId: string,
    @Param("chain") chain: "evm" | "aptos",
  ): Promise<SwapStatusDto> {
    return this.fusionService.getSwapStatus(htlcId, chain);
  }

  @Post("complete-swap-flow")
  @ApiOperation({ summary: "Execute a complete cross-chain swap flow" })
  @ApiResponse({
    status: 201,
    description: "Swap flow initiated successfully",
    type: CompleteSwapResultDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  completeSwapFlow(
    @Body() params: CompleteSwapParamsDto,
  ): Promise<CompleteSwapResultDto> {
    return this.fusionService.completeSwapFlow(params);
  }

  @Post("monitor-order-status")
  @ApiOperation({ summary: "Monitor the status of a Fusion order" })
  @ApiResponse({
    status: 200,
    description: "Order status retrieved successfully",
    type: OrderStatusDto,
  })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  monitorOrderStatus(
    @Body() params: MonitorOrderStatusDto,
  ): Promise<OrderStatusDto> {
    return this.fusionService.monitorOrderStatus(params);
  }
}
