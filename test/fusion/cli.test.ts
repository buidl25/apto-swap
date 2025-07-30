/**
 * Unit tests for the CLI module
 */
import { expect } from 'chai';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Fusion CLI', () => {
  // Sandbox for sinon stubs
  let sandbox: sinon.SinonSandbox;
  
  // Define types for our mock functions
  interface InitiateFusionSwapResult {
    success: boolean;
    orderHash?: string;
    htlcId?: string;
    preimage?: string;
    hashlock?: string;
    timelock?: number;
    error?: string;
  }
  
  interface CompleteFusionSwapResult {
    success: boolean;
    error?: string;
  }
  
  interface PreimageAndHashlock {
    preimage: string;
    hashlock: string;
  }
  
  // Mock modules for testing
  const mockFusionHtlcSwap = {
    initiateFusionSwap: sinon.stub().resolves({
      success: true,
      orderHash: '0xMockOrderHash',
      htlcId: '0xMockContractId',
      preimage: 'mockPreimage',
      hashlock: '0xMockHashlock',
      timelock: 1234567890
    } as InitiateFusionSwapResult),
    completeFusionSwap: sinon.stub().resolves({
      success: true
    } as CompleteFusionSwapResult),
    generatePreimageAndHashlock: sinon.stub().returns({
      preimage: 'mockPreimage',
      hashlock: '0xMockHashlock'
    } as PreimageAndHashlock)
  };
  
  const mockFormatTokenAmount = sinon.stub().callsFake((amount: string, decimals: number): string => {
    return amount; // Just return the amount for testing
  });
  
  const mockGetWalletAddress = sinon.stub().returns('0xMockWalletAddress');
  
  // Mock commander
  const mockAction = sinon.stub();
  const mockRequiredOption = sinon.stub().returnsThis();
  const mockOption = sinon.stub().returnsThis();
  const mockDescription = sinon.stub().returnsThis();
  
  const mockCommand = {
    description: mockDescription,
    requiredOption: mockRequiredOption,
    option: mockOption,
    action: mockAction
  };
  
  const mockProgram = {
    name: sinon.stub().returnsThis(),
    description: sinon.stub().returnsThis(),
    version: sinon.stub().returnsThis(),
    command: sinon.stub().returns(mockCommand),
    parse: sinon.stub()
  };
  
  beforeEach(() => {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Stub console methods to avoid cluttering test output
    sandbox.stub(console, 'log');
    sandbox.stub(console, 'error');
    sandbox.stub(console, 'warn');
    
    // Stub process.exit to prevent tests from exiting
    sandbox.stub(process, 'exit').callsFake((code?: string | number | null | undefined): never => {
      throw new Error(`process.exit was called with code ${code}`);
    });
    
    // Reset stubs
    mockFusionHtlcSwap.initiateFusionSwap.resetHistory();
    mockFusionHtlcSwap.completeFusionSwap.resetHistory();
    mockFormatTokenAmount.resetHistory();
    mockGetWalletAddress.resetHistory();
    mockAction.resetHistory();
    mockRequiredOption.resetHistory();
    mockOption.resetHistory();
    mockDescription.resetHistory();
    mockProgram.command.resetHistory();
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('CLI Commands', () => {
    it('should register initiate and complete commands', () => {
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Check if command was called with the expected command names
      expect(mockProgram.command.calledWith('initiate')).to.be.true;
      expect(mockProgram.command.calledWith('complete')).to.be.true;
    });
    
    it('should handle initiate command with required options', async () => {
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Get the action callback for the initiate command
      const initiateAction = mockAction.firstCall.args[0];
      expect(initiateAction).to.be.a('function');
      
      // Create mock options
      const options = {
        fromChain: 'evm',
        toChain: 'aptos',
        fromToken: '0xMockFromToken',
        toToken: '0xMockToToken',
        amount: '1.0',
        decimals: '18',
        recipient: '0xMockRecipient',
        timelock: '1800' // 30 minutes
      };
      
      // Execute the action
      await initiateAction(options);
      
      // Verify that initiateFusionSwap was called with correct parameters
      expect(mockFusionHtlcSwap.initiateFusionSwap.calledOnce).to.be.true;
      const initiateParams = mockFusionHtlcSwap.initiateFusionSwap.firstCall.args[0];
      expect(initiateParams.fromChain).to.equal('evm');
      expect(initiateParams.toChain).to.equal('aptos');
      expect(initiateParams.fromTokenAddress).to.equal('0xMockFromToken');
      expect(initiateParams.toTokenAddress).to.equal('0xMockToToken');
      expect(initiateParams.amount).to.equal('1.0');
      expect(initiateParams.recipient).to.equal('0xMockRecipient');
      expect(initiateParams.timelock).to.be.a('number');
    });
    
    it('should handle initiate command with default recipient', async () => {
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Get the action callback for the initiate command
      const initiateAction = mockAction.firstCall.args[0];
      expect(initiateAction).to.be.a('function');
      
      // Create mock options without recipient
      const options = {
        fromChain: 'evm',
        toChain: 'aptos',
        fromToken: '0xMockFromToken',
        toToken: '0xMockToToken',
        amount: '1.0',
        decimals: '18'
      };
      
      // Execute the action
      await initiateAction(options);
      
      // Verify that getWalletAddress was called
      expect(mockGetWalletAddress.calledOnce).to.be.true;
      
      // Verify that initiateFusionSwap was called with wallet address as recipient
      expect(mockFusionHtlcSwap.initiateFusionSwap.calledOnce).to.be.true;
      const initiateParams = mockFusionHtlcSwap.initiateFusionSwap.firstCall.args[0];
      expect(initiateParams.recipient).to.equal('0xMockWalletAddress');
    });
    
    it('should handle complete command with required options', async () => {
      // Reset mockAction to capture the complete command action
      mockAction.resetHistory();
      
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Get the action callback for the complete command (second call to mockAction)
      const completeAction = mockAction.secondCall.args[0];
      expect(completeAction).to.be.a('function');
      
      // Create mock options
      const options = {
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        preimage: 'mockPreimage',
        chain: 'aptos'
      };
      
      // Execute the action
      await completeAction(options);
      
      // Verify that completeFusionSwap was called with correct parameters
      expect(mockFusionHtlcSwap.completeFusionSwap.calledOnce).to.be.true;
      expect(mockFusionHtlcSwap.completeFusionSwap.firstCall.args[0]).to.equal('0xMockOrderHash');
      expect(mockFusionHtlcSwap.completeFusionSwap.firstCall.args[1]).to.equal('0xMockContractId');
      expect(mockFusionHtlcSwap.completeFusionSwap.firstCall.args[2]).to.equal('mockPreimage');
      expect(mockFusionHtlcSwap.completeFusionSwap.firstCall.args[3]).to.equal('aptos');
    });
    
    it('should handle initiate command failure', async () => {
      // Make initiateFusionSwap fail
      mockFusionHtlcSwap.initiateFusionSwap.resolves({
        success: false,
        error: 'Mock initiate error'
      } as InitiateFusionSwapResult);
      
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Get the action callback for the initiate command
      const initiateAction = mockAction.firstCall.args[0];
      expect(initiateAction).to.be.a('function');
      
      // Create mock options
      const options = {
        fromChain: 'evm',
        toChain: 'aptos',
        fromToken: '0xMockFromToken',
        toToken: '0xMockToToken',
        amount: '1.0',
        decimals: '18',
        recipient: '0xMockRecipient'
      };
      
      // Execute the action - should not throw since we're handling errors in the action
      await initiateAction(options);
      
      // Verify that initiateFusionSwap was called
      expect(mockFusionHtlcSwap.initiateFusionSwap.calledOnce).to.be.true;
      
      // Verify that console.error was called with the error message
      expect((console.error as sinon.SinonStub).calledWith('❌ Swap initiation failed: Mock initiate error')).to.be.true;
      
      // Reset the stub for other tests
      mockFusionHtlcSwap.initiateFusionSwap.resolves({
        success: true,
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        preimage: 'mockPreimage',
        hashlock: '0xMockHashlock',
        timelock: 1234567890
      } as InitiateFusionSwapResult);
    });
    
    it('should handle complete command failure', async () => {
      // Make completeFusionSwap fail
      mockFusionHtlcSwap.completeFusionSwap.resolves({
        success: false,
        error: 'Mock complete error'
      } as CompleteFusionSwapResult);
      
      // Reset mockAction to capture the complete command action
      mockAction.resetHistory();
      
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Get the action callback for the complete command (second call to mockAction)
      const completeAction = mockAction.secondCall.args[0];
      expect(completeAction).to.be.a('function');
      
      // Create mock options
      const options = {
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        preimage: 'mockPreimage',
        chain: 'aptos'
      };
      
      // Execute the action - should not throw since we're handling errors in the action
      await completeAction(options);
      
      // Verify that completeFusionSwap was called
      expect(mockFusionHtlcSwap.completeFusionSwap.calledOnce).to.be.true;
      
      // Verify that console.error was called with the error message
      expect((console.error as sinon.SinonStub).calledWith('❌ Swap completion failed: Mock complete error')).to.be.true;
      
      // Reset the stub for other tests
      mockFusionHtlcSwap.completeFusionSwap.resolves({
        success: true
      } as CompleteFusionSwapResult);
    });
    
    it('should handle exceptions in initiate command', async () => {
      // Make initiateFusionSwap throw an error
      const errorMessage = 'Test error in initiate';
      mockFusionHtlcSwap.initiateFusionSwap.rejects(new Error(errorMessage));
      
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Get the action callback for the initiate command
      const initiateAction = mockAction.firstCall.args[0];
      expect(initiateAction).to.be.a('function');
      
      // Create mock options
      const options = {
        fromChain: 'evm',
        toChain: 'aptos',
        fromToken: '0xMockFromToken',
        toToken: '0xMockToToken',
        amount: '1.0',
        decimals: '18',
        recipient: '0xMockRecipient'
      };
      
      // Execute the action - should not throw since we're handling errors in the action
      await initiateAction(options);
      
      // Verify that console.error was called with the error message
      expect((console.error as sinon.SinonStub).calledWith('Error:', errorMessage)).to.be.true;
      
      // Reset the stub for other tests
      mockFusionHtlcSwap.initiateFusionSwap.resolves({
        success: true,
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        preimage: 'mockPreimage',
        hashlock: '0xMockHashlock',
        timelock: 1234567890
      } as InitiateFusionSwapResult);
    });
    
    it('should handle exceptions in complete command', async () => {
      // Make completeFusionSwap throw an error
      const errorMessage = 'Test error in complete';
      mockFusionHtlcSwap.completeFusionSwap.rejects(new Error(errorMessage));
      
      // Reset mockAction to capture the complete command action
      mockAction.resetHistory();
      
      // Use proxyquire to load the CLI module with our mocks
      proxyquire('../../scripts/fusion/cli', {
        'commander': { Command: sinon.stub().returns(mockProgram), program: mockProgram },
        './fusion-htlc-swap': mockFusionHtlcSwap,
        './create-order': { formatTokenAmount: mockFormatTokenAmount },
        './sdk-setup': { getWalletAddress: mockGetWalletAddress }
      });
      
      // Get the action callback for the complete command (second call to mockAction)
      const completeAction = mockAction.secondCall.args[0];
      expect(completeAction).to.be.a('function');
      
      // Create mock options
      const options = {
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        preimage: 'mockPreimage',
        chain: 'aptos'
      };
      
      // Execute the action - should not throw since we're handling errors in the action
      await completeAction(options);
      
      // Verify that console.error was called with the error message
      expect((console.error as sinon.SinonStub).calledWith('Error:', errorMessage)).to.be.true;
      
      // Reset the stub for other tests
      mockFusionHtlcSwap.completeFusionSwap.resolves({
        success: true
      } as CompleteFusionSwapResult);
    });
  });
});
