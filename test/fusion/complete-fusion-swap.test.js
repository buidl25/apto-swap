/**
 * Unit tests for the Complete Fusion Swap script
 */
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const ethers = require('ethers');
const dotenv = require('dotenv');

// Mock dependencies before importing the script
const mockSwapDetails = {
  preimage: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  hashlock: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  evmContractId: '0xMockEvmContractId',
  aptosContractId: '0xMockAptosContractId',
  orderHash: '0xMockOrderHash',
  status: 'pending'
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
    withdraw: sinon.stub().resolves({ hash: '0xMockTxHash', wait: sinon.stub().resolves({ status: 1 }) })
  })
};

// Mock contract
const mockContract = {
  connect: sinon.stub().returns({
    withdraw: sinon.stub().resolves({ hash: '0xMockTxHash', wait: sinon.stub().resolves({ status: 1 }) })
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
describe('Complete Fusion Swap', function() {
  let sandbox;
  let consoleLogStub;
  let fsReadFileStub;
  let fsWriteFileStub;
  let mockCompleteSwapScript;
  
  const mockEnv = {
    ONE_INCH_API_KEY: 'mock-api-key',
    EVM_TOKEN_ADDRESS: '0xMockTokenAddress',
    APTOS_RECIPIENT: '0xMockAptosRecipient',
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
    
    // Stub fs.readFileSync
    fsReadFileStub = sandbox.stub(fs, 'readFileSync').returns(JSON.stringify(mockSwapDetails));
    
    // Stub fs.writeFileSync
    fsWriteFileStub = sandbox.stub(fs, 'writeFileSync');
    
    // Stub fs.existsSync
    sandbox.stub(fs, 'existsSync').returns(true);
    
    // Stub process.env
    Object.keys(mockEnv).forEach(key => {
      sandbox.stub(process.env, key).value(mockEnv[key]);
    });
    
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
      return require(module);
    });
    
    // Import the script after mocking
    mockCompleteSwapScript = require('../../scripts/complete-fusion-swap');
  });
  
  afterEach(function() {
    // Restore all stubs and mocks
    sandbox.restore();
    
    // Clear the require cache to ensure fresh imports
    delete require.cache[require.resolve('../../scripts/complete-fusion-swap')];
  });
  
  describe('main function', function() {
    it('should complete the swap successfully', async function() {
      // Execute the main function
      await mockCompleteSwapScript.main();
      
      // Verify EVM HTLC withdraw was called
      expect(mockContract.connect().withdraw.calledOnce).to.be.true;
      
      // Verify Aptos HTLC withdraw was called
      expect(mockAptosClient.signAndSubmitTransaction.calledOnce).to.be.true;
      
      // Verify swap details were updated
      expect(fsWriteFileStub.calledOnce).to.be.true;
      const writeArgs = fsWriteFileStub.firstCall.args;
      const updatedSwapDetails = JSON.parse(writeArgs[1]);
      expect(updatedSwapDetails.status).to.equal('completed');
      
      // Verify console output
      expect(consoleLogStub.calledWith(sinon.match(/Swap completed successfully/))).to.be.true;
    });
    
    it('should handle missing swap details file', async function() {
      // Make the file not exist
      fs.existsSync.restore();
      sandbox.stub(fs, 'existsSync').returns(false);
      
      // Execute the main function and expect it to throw
      try {
        await mockCompleteSwapScript.main();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Swap details file not found');
      }
    });
    
    it('should handle EVM withdraw errors', async function() {
      // Make EVM withdraw fail
      mockContract.connect().withdraw.rejects(new Error('EVM Withdraw Error'));
      
      // Execute the main function and expect it to throw
      try {
        await mockCompleteSwapScript.main();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('EVM Withdraw Error');
      }
    });
    
    it('should handle Aptos withdraw errors', async function() {
      // Make Aptos withdraw fail
      mockAptosClient.signAndSubmitTransaction.rejects(new Error('Aptos Withdraw Error'));
      
      // Execute the main function and expect it to throw
      try {
        await mockCompleteSwapScript.main();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Aptos Withdraw Error');
      }
    });
  });
});
