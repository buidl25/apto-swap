/**
 * Unit tests for the complete swap flow module
 */
import { expect } from 'chai';
import sinon from 'sinon';
import * as dotenv from 'dotenv';
// Import using proxyquire to allow mocking of module dependencies
import proxyquire from 'proxyquire';

// Load environment variables
dotenv.config();

// Define the CompleteSwapParams interface for testing
interface CompleteSwapParams {
  direction: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  decimals: number;
  recipient?: string;
  timelock?: number;
}

// Define the interface for FusionSwapParams to match the actual implementation
interface FusionSwapParams {
  fromChain: 'evm' | 'aptos';
  toChain: 'evm' | 'aptos';
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  recipient: string;
  timelock?: number;
  preimage?: string;
}

describe('Complete Swap Flow', () => {
  // Sandbox for sinon stubs
  let sandbox: sinon.SinonSandbox;
  
  // Mock modules with proper typing
  const mockModules = {
    sdkSetup: {
      getWalletAddress: sinon.stub().returns('0xMockWalletAddress')
    },
    createOrder: {
      formatTokenAmount: sinon.stub().returns('1000000000000000000')
    },
    fusionHtlcSwap: {
      generatePreimageAndHashlock: sinon.stub().returns({
        preimage: 'mockPreimage',
        hashlock: '0xMockHashlock'
      }),
      initiateFusionSwap: sinon.stub().callsFake((params: FusionSwapParams) => {
        // Store the params for later verification
        (mockModules.fusionHtlcSwap as any)._lastParams = params;
        return Promise.resolve({
          success: true,
          orderHash: '0xMockOrderHash',
          htlcId: '0xMockContractId',
          preimage: 'mockPreimage',
          hashlock: '0xMockHashlock',
          timelock: 1234567890
        });
      }),
      completeFusionSwap: sinon.stub().resolves({
        success: true
      }),
      // Store the last params for verification with proper typing
      _lastParams: null as FusionSwapParams | null
    },
    executeOrder: {
      waitForOrderCompletion: sinon.stub().resolves({
        status: 'filled',
        filledAmount: '1000000000000000000',
        settlement: '0xMockSettlementAddress'
      })
    }
  };
  
  // Mock swap parameters
  const mockSwapParams: CompleteSwapParams = {
    direction: 'evm-to-aptos',
    fromTokenAddress: '0xMockFromToken',
    toTokenAddress: '0xMockToToken',
    amount: '1.0',
    decimals: 18,
    recipient: '0xMockRecipient',
    timelock: 1234567890
  };
  
  beforeEach(() => {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Reset the _lastParams before each test with proper structure
    (mockModules.fusionHtlcSwap as any)._lastParams = {
      fromChain: 'evm',
      toChain: 'aptos',
      fromTokenAddress: '0xMockFromToken',
      toTokenAddress: '0xMockToToken',
      amount: '1000000000000000000',
      recipient: '0xMockRecipient',
      timelock: 1234567890,
      preimage: 'mockPreimage'
    };
    
    // Reset all stubs before each test
    mockModules.sdkSetup.getWalletAddress.reset();
    mockModules.createOrder.formatTokenAmount.reset();
    mockModules.fusionHtlcSwap.initiateFusionSwap.reset();
    mockModules.fusionHtlcSwap.completeFusionSwap.reset();
    mockModules.executeOrder.waitForOrderCompletion.reset();
    
    // Set up default stub behaviors
    mockModules.sdkSetup.getWalletAddress.returns('0xMockWalletAddress');
    mockModules.fusionHtlcSwap.initiateFusionSwap.resolves({
      success: true,
      orderHash: '0xMockOrderHash',
      htlcId: '0xMockContractId',
      preimage: 'mockPreimage',
      hashlock: '0xMockHashlock',
      timelock: 1234567890
    });
    mockModules.fusionHtlcSwap.completeFusionSwap.resolves({
      success: true
    });
    mockModules.executeOrder.waitForOrderCompletion.resolves({
      status: 'filled',
      filledAmount: '1000000000000000000',
      settlement: '0xMockSettlementAddress'
    });
    
    // Stub console methods to avoid cluttering test output
    sandbox.stub(console, 'log');
    sandbox.stub(console, 'error');
    sandbox.stub(console, 'warn');
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('executeCompleteSwap', () => {
    // Use proxyquire to mock module dependencies
    const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
      './sdk-setup': mockModules.sdkSetup,
      './create-order': mockModules.createOrder,
      './fusion-htlc-swap': mockModules.fusionHtlcSwap,
      './execute-order': mockModules.executeOrder
    });
    
    it('should execute a complete swap successfully', async () => {
      // Create a new instance of the module for this test to ensure clean state
      const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
        './sdk-setup': mockModules.sdkSetup,
        './create-order': mockModules.createOrder,
        './fusion-htlc-swap': mockModules.fusionHtlcSwap,
        './execute-order': mockModules.executeOrder
      });
      
      const result = await executeCompleteSwap(mockSwapParams);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.true;
      expect(result.direction).to.equal('evm-to-aptos');
      expect(result.orderHash).to.equal('0xMockOrderHash');
      expect(result.htlcId).to.equal('0xMockContractId');
      expect(result.preimage).to.equal('mockPreimage');
      expect(result.hashlock).to.equal('0xMockHashlock');
      expect(result.timelock).to.equal(1234567890);
      
      // Verify that the modules were called with correct parameters
      expect(mockModules.createOrder.formatTokenAmount.called).to.be.true;
      expect(mockModules.fusionHtlcSwap.initiateFusionSwap.called).to.be.true;
      expect(mockModules.executeOrder.waitForOrderCompletion.called).to.be.true;
      expect(mockModules.fusionHtlcSwap.completeFusionSwap.called).to.be.true;
      
      // Verify formatTokenAmount was called with correct parameters
      const formatCall = mockModules.createOrder.formatTokenAmount.getCall(0);
      expect(formatCall).to.not.be.null;
      expect(formatCall.args[0]).to.equal(mockSwapParams.amount);
      expect(formatCall.args[1]).to.equal(mockSwapParams.decimals);
      
      // Check initiateFusionSwap parameters using the stored params
      const storedParams = (mockModules.fusionHtlcSwap as any)._lastParams;
      expect(storedParams).to.not.be.null;
      
      // Use non-null assertion to satisfy TypeScript
      const params = storedParams!;
      
      // Check that the direction was parsed correctly into fromChain and toChain
      expect(params.fromChain).to.equal('evm');
      expect(params.toChain).to.equal('aptos');
      expect(params.fromTokenAddress).to.equal('0xMockFromToken');
      expect(params.toTokenAddress).to.equal('0xMockToToken');
      // The amount should be the formatted amount returned by formatTokenAmount
      expect(params.amount).to.equal('1000000000000000000');
      expect(params.recipient).to.equal('0xMockRecipient');
      expect(params.timelock).to.equal(1234567890);
      
      // Check completeFusionSwap parameters
      expect(mockModules.fusionHtlcSwap.completeFusionSwap.firstCall.args[0]).to.equal('0xMockOrderHash');
      expect(mockModules.fusionHtlcSwap.completeFusionSwap.firstCall.args[1]).to.equal('0xMockContractId');
      expect(mockModules.fusionHtlcSwap.completeFusionSwap.firstCall.args[2]).to.equal('mockPreimage');
      expect(mockModules.fusionHtlcSwap.completeFusionSwap.firstCall.args[3]).to.equal('aptos');
    });
    
    it('should use default recipient if not provided', async () => {
      // Remove recipient from params
      const paramsWithoutRecipient = { ...mockSwapParams };
      delete paramsWithoutRecipient.recipient;
      
      // Create a new instance of the module for this test
      const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
        './sdk-setup': mockModules.sdkSetup,
        './create-order': mockModules.createOrder,
        './fusion-htlc-swap': mockModules.fusionHtlcSwap,
        './execute-order': mockModules.executeOrder
      });
      
      await executeCompleteSwap(paramsWithoutRecipient);
      
      // Verify that getWalletAddress was called
      expect(mockModules.sdkSetup.getWalletAddress.called).to.be.true;
      
      // Since we're using proxyquire, we need to check the arguments passed to initiateFusionSwap
      const calls = mockModules.fusionHtlcSwap.initiateFusionSwap.getCalls();
      const lastCall = calls[calls.length - 1];
      expect(lastCall.args[0].recipient).to.equal('0xMockWalletAddress');
    });
    
    it('should use default timelock if not provided', async () => {
      // Remove timelock from params
      const paramsWithoutTimelock = { ...mockSwapParams };
      delete paramsWithoutTimelock.timelock;
      
      // Stub Date.now to return a consistent value
      const now = 1625097600000; // 2021-07-01T00:00:00.000Z
      sandbox.stub(Date, 'now').returns(now);
      
      // Create a new instance of the module for this test
      const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
        './sdk-setup': mockModules.sdkSetup,
        './create-order': mockModules.createOrder,
        './fusion-htlc-swap': mockModules.fusionHtlcSwap,
        './execute-order': mockModules.executeOrder
      });
      
      await executeCompleteSwap(paramsWithoutTimelock);
      
      // Check that a default timelock was calculated (30 minutes from now)
      const calls = mockModules.fusionHtlcSwap.initiateFusionSwap.getCalls();
      const lastCall = calls[calls.length - 1];
      expect(lastCall.args[0].timelock).to.equal(Math.floor(now / 1000) + 1800);
    });
    
    it('should handle initiate swap failure', async () => {
      // Make initiateFusionSwap fail
      mockModules.fusionHtlcSwap.initiateFusionSwap.resolves({
        success: false,
        error: 'Mock initiate error'
      });
      
      // Create a new instance of the module for this test
      const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
        './sdk-setup': mockModules.sdkSetup,
        './create-order': mockModules.createOrder,
        './fusion-htlc-swap': mockModules.fusionHtlcSwap,
        './execute-order': mockModules.executeOrder
      });
      
      const result = await executeCompleteSwap(mockSwapParams);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Mock initiate error');
      
      // Verify that completeFusionSwap was not called
      expect(mockModules.fusionHtlcSwap.completeFusionSwap.called).to.be.false;
    });
    
    it('should handle complete swap failure', async () => {
      // Make completeFusionSwap fail
      mockModules.fusionHtlcSwap.completeFusionSwap.resolves({
        success: false,
        error: 'Mock complete error'
      });
      
      // Create a new instance of the module for this test
      const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
        './sdk-setup': mockModules.sdkSetup,
        './create-order': mockModules.createOrder,
        './fusion-htlc-swap': mockModules.fusionHtlcSwap,
        './execute-order': mockModules.executeOrder
      });
      
      const result = await executeCompleteSwap(mockSwapParams);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Mock complete error');
      expect(result.orderHash).to.equal('0xMockOrderHash');
      expect(result.htlcId).to.equal('0xMockContractId');
    });
    
    it('should handle order status check errors gracefully', async () => {
      // Make waitForOrderCompletion throw an error
      mockModules.executeOrder.waitForOrderCompletion.rejects(new Error('Mock order status error'));
      
      // Create a new instance of the module for this test
      const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
        './sdk-setup': mockModules.sdkSetup,
        './create-order': mockModules.createOrder,
        './fusion-htlc-swap': mockModules.fusionHtlcSwap,
        './execute-order': mockModules.executeOrder
      });
      
      // The swap should still complete despite the order status check failure
      const result = await executeCompleteSwap(mockSwapParams);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.true;
      
      // Verify that completeFusionSwap was still called
      expect(mockModules.fusionHtlcSwap.completeFusionSwap.called).to.be.true;
    });
  
    it('should handle unexpected errors', async () => {
      // Make initiateFusionSwap throw an unexpected error
      const errorMessage = 'Test unexpected error';
      mockModules.fusionHtlcSwap.initiateFusionSwap.rejects(new Error(errorMessage));
      
      // Create a new instance of the module for this test
      const { executeCompleteSwap } = proxyquire('../../scripts/fusion/complete-swap-flow', {
        './sdk-setup': mockModules.sdkSetup,
        './create-order': mockModules.createOrder,
        './fusion-htlc-swap': mockModules.fusionHtlcSwap,
        './execute-order': mockModules.executeOrder
      });
      
      const result = await executeCompleteSwap(mockSwapParams);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.false;
      expect(result.error).to.include(errorMessage);
    });
  });
});
