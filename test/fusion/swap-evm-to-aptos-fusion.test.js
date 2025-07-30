/**
 * Unit tests for the EVM to Aptos Fusion swap script
 */
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ethers = require('ethers');
const dotenv = require('dotenv');

// Mock dependencies before importing the script
const mockFusionSDK = {
  createOrder: sinon.stub().resolves({ orderHash: '0xMockOrderHash' }),
  submitOrder: sinon.stub().resolves({ success: true }),
  getActiveOrders: sinon.stub().resolves([{ orderHash: '0xMockOrderHash', status: 'filled' }])
};

// Mock ethers provider
const mockProvider = {
  getNetwork: sinon.stub().resolves({ chainId: 1 }),
  getBlockNumber: sinon.stub().resolves(1000),
  getGasPrice: sinon.stub().resolves(ethers.parseUnits('50', 'gwei')),
  getBlock: sinon.stub().resolves({ timestamp: Math.floor(Date.now() / 1000) })
};

// Mock wallet
const mockWallet = {
  address: '0xMockWalletAddress',
  getAddress: sinon.stub().resolves('0xMockWalletAddress'),
  signMessage: sinon.stub().resolves('0xMockSignature'),
  connect: sinon.stub().returns({
    createHTLC: sinon.stub().resolves({ hash: '0xMockTxHash', wait: sinon.stub().resolves({ status: 1 }) })
  })
};

// Mock contract
const mockContract = {
  connect: sinon.stub().returns({
    createHTLC: sinon.stub().resolves({ hash: '0xMockTxHash', wait: sinon.stub().resolves({ status: 1 }) })
  })
};

// Mock AptosClient
const mockAptosClient = {
  getAccountResources: sinon.stub().resolves([]),
  generateTransaction: sinon.stub().resolves({ hash: 'mockTxHash' }),
  signAndSubmitTransaction: sinon.stub().resolves('mockTxHash'),
  waitForTransaction: sinon.stub().resolves({ success: true })
};

// Setup test environment
describe('EVM to Aptos Fusion Swap', function() {
  let sandbox;
  let consoleLogStub;
  let fsWriteFileStub;
  let mockSwapScript;
  
  const mockEnv = {
    ONE_INCH_API_KEY: 'mock-api-key',
    EVM_TOKEN_ADDRESS: '0xMockTokenAddress',
    APTOS_RECIPIENT: '0xMockAptosRecipient',
    SWAP_AMOUNT: '1000000000000000000', // 1 ETH
    RESOLVER_ADDRESS: '0xMockResolverAddress',
    EVM_PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    APTOS_PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    EVM_RPC_URL: 'http://localhost:8545',
    EVM_HTLC_ADDRESS: '0xMockHtlcAddress',
    APTOS_MODULE_ADDRESS: '0xMockAptosModuleAddress'
  };
  
  beforeEach(function() {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Stub console.log
    consoleLogStub = sandbox.stub(console, 'log');
    
    // Stub fs.writeFileSync
    fsWriteFileStub = sandbox.stub(fs, 'writeFileSync');
    
    // Stub process.env
    Object.keys(mockEnv).forEach(key => {
      sandbox.stub(process.env, key).value(mockEnv[key]);
    });
    
    // Stub crypto.randomBytes to return predictable values
    sandbox.stub(crypto, 'randomBytes').returns(Buffer.from('0123456789abcdef0123456789abcdef', 'hex'));
    
    // Stub ethers
    sandbox.stub(ethers, 'providers').value({
      JsonRpcProvider: function() {
        return mockProvider;
      }
    });
    
    sandbox.stub(ethers, 'Wallet').returns(mockWallet);
    sandbox.stub(ethers, 'Contract').returns(mockContract);
    
    // Stub AptosClient
    sandbox.stub(global, 'require').callsFake((module) => {
      if (module === 'aptos') {
        return {
          AptosClient: function() {
            return mockAptosClient;
          },
          AptosAccount: function() {
            return { address: () => '0xMockAptosAddress' };
          },
          TxnBuilderTypes: {
            EntryFunction: {
              natural: () => 'mockEntryFunction'
            }
          },
          BCS: {
            bcsToBytes: () => new Uint8Array([1, 2, 3])
          }
        };
      }
      if (module === '@1inch/fusion-sdk') {
        return {
          FusionSDK: function() {
            return mockFusionSDK;
          },
          BlockchainName: {
            ETHEREUM: 'ethereum'
          }
        };
      }
      if (module === '../scripts/fusion/mock-price-oracle') {
        return {
          MockPriceOracle: class {
            constructor() {}
            getCurrentPrice() { return '1000000000000000000'; }
            generateAuctionPoints() { return ['1000,1000000000000000000', '2000,900000000000000000']; }
          }
        };
      }
      return require(module);
    });
    
    // Reset stubs
    mockFusionSDK.createOrder.reset();
    mockFusionSDK.submitOrder.reset();
    mockFusionSDK.getActiveOrders.reset();
    
    // Import the script after mocking
    mockSwapScript = require('../../scripts/swap-evm-to-aptos-fusion');
  });
  
  afterEach(function() {
    // Restore all stubs and mocks
    sandbox.restore();
    
    // Clear the require cache to ensure fresh imports
    delete require.cache[require.resolve('../../scripts/swap-evm-to-aptos-fusion')];
  });
  
  describe('main function', function() {
    it('should execute the full swap flow successfully', async function() {
      // Execute the main function
      await mockSwapScript.main();
      
      // Verify Fusion order was created
      expect(mockFusionSDK.createOrder.calledOnce).to.be.true;
      
      // Verify Fusion order was submitted
      expect(mockFusionSDK.submitOrder.calledOnce).to.be.true;
      
      // Verify EVM HTLC was created
      expect(mockContract.connect().createHTLC.calledOnce).to.be.true;
      
      // Verify Aptos HTLC was created
      expect(mockAptosClient.signAndSubmitTransaction.calledOnce).to.be.true;
      
      // Verify swap details were saved
      expect(fsWriteFileStub.calledOnce).to.be.true;
      
      // Verify console output
      expect(consoleLogStub.calledWith(sinon.match(/Swap initiated successfully/))).to.be.true;
    });
    
    it('should handle errors gracefully', async function() {
      // Make one of the steps fail
      mockFusionSDK.submitOrder.rejects(new Error('API Error'));
      
      // Execute the main function and expect it to throw
      try {
        await mockSwapScript.main();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('API Error');
      }
    });
  });
});
