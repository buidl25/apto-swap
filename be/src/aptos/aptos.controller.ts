import { Controller, Get, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AptosService } from "./aptos.service";

@ApiTags("aptos")
@Controller("aptos")
export class AptosController {
  constructor(private readonly aptosService: AptosService) {}

  @Get("address")
  @ApiOperation({ summary: "Get Aptos address" })
  @ApiResponse({ status: 200, description: "Returns the Aptos address" })
  getAptosAddress() {
    return this.aptosService.getAptosAddress();
  }

  @Post("token/register")
  @ApiOperation({ summary: "Register Aptos token" })
  @ApiResponse({ status: 201, description: "Token registered successfully" })
  registerAptosToken() {
    return this.aptosService.registerAptosToken();
  }

  @Post("token/setup")
  @ApiOperation({ summary: "Setup Aptos token" })
  @ApiResponse({ status: 201, description: "Token setup completed" })
  setupAptosToken() {
    return this.aptosService.setupAptosToken();
  }

  @Post("token/mint")
  @ApiOperation({ summary: "Mint Aptos tokens" })
  @ApiResponse({ status: 201, description: "Tokens minted successfully" })
  mintAptosTokens() {
    return this.aptosService.mintAptosTokens();
  }

  @Get("balance")
  @ApiOperation({ summary: "Check Aptos balance" })
  @ApiResponse({ status: 200, description: "Returns the Aptos balance" })
  checkAptosBalance() {
    return this.aptosService.checkAptosBalance();
  }

  @Post("htlc/create")
  @ApiOperation({ summary: "Create Aptos HTLC" })
  @ApiResponse({ status: 201, description: "HTLC created successfully" })
  createAptosHtlc() {
    // TODO: Replace with actual parameters from request body
    return this.aptosService.createAptosHtlc({
      recipient: "0x1", // Example recipient address
      amount: "100", // Example amount
      hashlock: "0x123", // Example hashlock
      timelock: Math.floor(Date.now() / 1000) + 3600, // Example timelock (1 hour from now)
    });
  }

  @Post("htlc/withdraw")
  @ApiOperation({ summary: "Withdraw from Aptos HTLC" })
  @ApiResponse({ status: 200, description: "Withdrawal successful" })
  withdrawAptosHtlc() {
    // TODO: Replace with actual parameters from request body
    return this.aptosService.withdrawAptosHtlc({
      contractId: "0x123", // Example contract ID
      preimage: "secret", // Example preimage
    });
  }

  @Post("htlc/refund")
  @ApiOperation({ summary: "Refund from Aptos HTLC" })
  @ApiResponse({ status: 200, description: "Refund successful" })
  refundAptosHtlc() {
    // TODO: Replace with actual parameters from request body
    return this.aptosService.refundAptosHtlc({
      contractId: "0x123", // Example contract ID
    });
  }

  @Get("htlc/events")
  @ApiOperation({ summary: "Get Aptos HTLC events" })
  @ApiResponse({ status: 200, description: "Returns HTLC events" })
  checkAptosHtlcEvents() {
    return this.aptosService.checkAptosHtlcEvents();
  }

  @Post("htlc/initialize")
  @ApiOperation({ summary: "Initialize Aptos HTLC" })
  @ApiResponse({ status: 201, description: "HTLC initialized successfully" })
  initializeAptosHtlc() {
    return this.aptosService.initializeAptosHtlc();
  }
}
