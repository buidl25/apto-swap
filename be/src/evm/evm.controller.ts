import { Controller, Get, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EvmService } from "./evm.service";

@ApiTags("evm")
@Controller("evm")
export class EvmController {
  constructor(private readonly evmService: EvmService) {}

  @Post("node/start")
  @ApiOperation({ summary: "Start EVM node" })
  @ApiResponse({ status: 201, description: "Node started successfully" })
  startEvmNode() {
    return this.evmService.startEvmNode();
  }

  @Post("token/deploy")
  @ApiOperation({ summary: "Deploy EVM token" })
  @ApiResponse({ status: 201, description: "Token deployed successfully" })
  deployEvmToken() {
    return this.evmService.deployEvmToken();
  }

  @Post("htlc/deploy")
  @ApiOperation({ summary: "Deploy EVM HTLC" })
  @ApiResponse({ status: 201, description: "HTLC deployed successfully" })
  deployEvmHtlc() {
    return this.evmService.deployEvmHtlc();
  }

  @Post("htlc/create")
  @ApiOperation({ summary: "Create EVM HTLC" })
  @ApiResponse({ status: 201, description: "HTLC created successfully" })
  createEvmHtlc() {
    return this.evmService.createEvmHtlc();
  }

  @Get("balance")
  @ApiOperation({ summary: "Check EVM balance" })
  @ApiResponse({ status: 200, description: "Returns the EVM balance" })
  checkEvmBalance() {
    return this.evmService.checkEvmBalance();
  }

  @Post("htlc/withdraw")
  @ApiOperation({ summary: "Withdraw from EVM HTLC" })
  @ApiResponse({ status: 200, description: "Withdrawal successful" })
  withdrawEvmHtlc() {
    // TODO: Replace with actual parameters from request body
    return this.evmService.withdrawEvmHtlc({
      contractId: "0x123", // Example contract ID
      preimage: "secret", // Example preimage
    });
  }

  @Post("resolver/deploy")
  @ApiOperation({ summary: "Deploy Fusion resolver" })
  @ApiResponse({ status: 201, description: "Resolver deployed successfully" })
  deployFusionResolver() {
    return this.evmService.deployFusionResolver();
  }

  @Post("resolver/interact")
  @ApiOperation({ summary: "Interact with resolver" })
  @ApiResponse({ status: 200, description: "Interaction successful" })
  interactWithResolver() {
    return this.evmService.interactWithResolver();
  }
}
