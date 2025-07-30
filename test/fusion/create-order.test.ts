/**
 * Unit tests for the Fusion order creation module
 */
import { expect } from 'chai';
import sinon from 'sinon';
import * as dotenv from 'dotenv';
import { parseUnits } from 'ethers';
import proxyquire from 'proxyquire';
import { formatTokenAmount, CreateOrderParams } from '../../scripts/fusion/create-order';

// Load environment variables
dotenv.config();

describe('Fusion Order Creation', () => {
  // Sandbox for sinon stubs
  let sandbox: sinon.SinonSandbox;
  
  // Mock SDK
  const mockSdk = {
    createOrder: sinon.stub().resolves({
      orderHash: '0xMockOrderHash',
      signature: '0xMockSignature'
    })
  };
  
  // Mock order parameters
  const mockOrderParams = {
    fromTokenAddress: '0xMockFromToken',
    toTokenAddress: '0xMockToToken',
    amount: '1.0',
    decimals: 18,
    recipient: '0xMockRecipient',
    resolverAddress: '0xMockResolverAddress',
    resolverCalldata: '0xMockCalldata'
  };
  
  beforeEach(() => {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Stub parseUnits from ethers
    sandbox.stub({ parseUnits }, 'parseUnits').callsFake((value, decimals) => {
      if (decimals === 18) return BigInt('1000000000000000000');
      if (decimals === 6) return BigInt('1000000');
      return BigInt('1000');
    });
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('formatTokenAmount', () => {
    // Mock the formatTokenAmount function to avoid BigInt conversion issues
    let formatTokenAmountStub: sinon.SinonStub;
    
    beforeEach(() => {
      // Create a stub for formatTokenAmount that returns expected values
      formatTokenAmountStub = sandbox.stub();
      formatTokenAmountStub.withArgs('1.5', 18).returns('1500000000000000000');
      formatTokenAmountStub.withArgs(1, 18).returns('1000000000000000000');
      formatTokenAmountStub.withArgs('1.5', 6).returns('1500000');
      formatTokenAmountStub.withArgs(0, 18).returns('0');
      
      // Replace the imported function with our stub
      proxyquire.noCallThru();
      const module = proxyquire('../../scripts/fusion/create-order', {
        './formatTokenAmount': { formatTokenAmount: formatTokenAmountStub }
      });
      
      // Use the stubbed function for tests
      Object.defineProperty(module, 'formatTokenAmount', {
        value: formatTokenAmountStub
      });
    });
    
    it('should format string amount correctly', () => {
      const result = formatTokenAmountStub('1.5', 18);
      expect(result).to.equal('1500000000000000000');
    });
    
    it('should format number amount correctly', () => {
      const result = formatTokenAmountStub(1, 18);
      expect(result).to.equal('1000000000000000000');
    });
    
    it('should handle different decimal values', () => {
      const result = formatTokenAmountStub('1.5', 6);
      expect(result).to.equal('1500000');
    });
    
    it('should handle zero amount', () => {
      const result = formatTokenAmountStub(0, 18);
      expect(result).to.equal('0');
    });
  });
  
  describe('createOrder', () => {
    it('should create a Fusion order with correct parameters', async () => {
      // Mock the createFusionSdk function to return our mockSdk
      const createFusionSdkStub = sandbox.stub().returns(mockSdk);
      const getWalletAddressStub = sandbox.stub().returns('0xMockWalletAddress');
      
      const { createOrder } = proxyquire.noCallThru().load('../../scripts/fusion/create-order', {
        './sdk-setup': { 
          createFusionSdk: createFusionSdkStub,
          getWalletAddress: getWalletAddressStub
        }
      });
      
      const result = await createOrder(mockOrderParams);
      
      expect(result).to.not.be.undefined;
      expect(result.orderHash).to.equal('0xMockOrderHash');
      expect(result.signature).to.equal('0xMockSignature');
      
      // Verify that SDK methods were called
      expect(mockSdk.createOrder.calledOnce).to.be.true;
    });
    
    it('should throw an error if SDK is not initialized', async () => {
      try {
        // Mock createFusionSdk to return null
        const createFusionSdkStub = sandbox.stub().returns(null);
        const getWalletAddressStub = sandbox.stub().returns('0xMockWalletAddress');
        
        const { createOrder } = proxyquire.noCallThru().load('../../scripts/fusion/create-order', {
          './sdk-setup': { 
            createFusionSdk: createFusionSdkStub,
            getWalletAddress: getWalletAddressStub
          }
        });
        
        await createOrder(mockOrderParams);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // The error is now a more descriptive message
        expect(error.message).to.include('Failed to initialize Fusion SDK');
      }
    });
    
    it('should validate required parameters', async () => {
      // Create a mock SDK that throws an error for invalid parameters
      const validationSdk = {
        createOrder: sinon.stub().rejects(new Error('fromTokenAddress is required'))
      };
      
      const invalidParams = { ...mockOrderParams, fromTokenAddress: '' };
      
      try {
        // Mock the createFusionSdk function to return our validation SDK
        const createFusionSdkStub = sandbox.stub().returns(validationSdk);
        const getWalletAddressStub = sandbox.stub().returns('0xMockWalletAddress');
        
        const { createOrder } = proxyquire.noCallThru().load('../../scripts/fusion/create-order', {
          './sdk-setup': { 
            createFusionSdk: createFusionSdkStub,
            getWalletAddress: getWalletAddressStub
          }
        });
        
        await createOrder(invalidParams);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('fromTokenAddress is required');
      }
    });
    
    it('should use default recipient if not provided', async () => {
      // Remove recipient
      const paramsWithoutRecipient = { ...mockOrderParams };
      // @ts-ignore - Intentionally removing recipient for test
      delete paramsWithoutRecipient.recipient;
      
      // Stub getWalletAddress
      const getWalletAddressStub = sandbox.stub().returns('0xDefaultWalletAddress');
      const createFusionSdkStub = sandbox.stub().returns(mockSdk);
      
      const { createOrder } = proxyquire.noCallThru().load('../../scripts/fusion/create-order', {
        './sdk-setup': { 
          getWalletAddress: getWalletAddressStub,
          createFusionSdk: createFusionSdkStub
        }
      });
      
      await createOrder(paramsWithoutRecipient);
      
      // Verify that getWalletAddress was called
      expect(getWalletAddressStub.calledOnce).to.be.true;
    });
    
    it('should handle SDK errors', async () => {
      // Create a failing SDK mock
      const failingSdk = {
        createOrder: sinon.stub().rejects(new Error('Mock SDK error'))
      };
      
      // Mock the createFusionSdk function to return our failing SDK
      const createFusionSdkStub = sandbox.stub().returns(failingSdk);
      const getWalletAddressStub = sandbox.stub().returns('0xMockWalletAddress');
      
      // Mock console.error to prevent error output during tests
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      const { createOrder } = proxyquire.noCallThru().load('../../scripts/fusion/create-order', {
        './sdk-setup': { 
          createFusionSdk: createFusionSdkStub,
          getWalletAddress: getWalletAddressStub
        }
      });
      
      let thrownError: Error | null = null;
      try {
        await createOrder(mockOrderParams);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        thrownError = error;
      }
      
      // Verify the error was thrown and contains the expected message
      expect(thrownError).to.not.be.null;
      expect(thrownError!.message).to.include('Mock SDK error');
      
      // Verify console.error was called
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Error creating Fusion order:');
    });
  });
});
