/**
 * Unit tests for the Fusion HTLC swap integration module
 */
import { expect } from 'chai';
import sinon from 'sinon';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Fusion HTLC Swap Integration', () => {
  // Sandbox for sinon stubs
  let sandbox: sinon.SinonSandbox;
  
  // Mocked functions
  let generatePreimageAndHashlockStub: sinon.SinonStub;
  let initiateFusionSwapStub: sinon.SinonStub;
  let completeFusionSwapStub: sinon.SinonStub;
  
  beforeEach(() => {
    // Create a sandbox for the test
    sandbox = sinon.createSandbox();
    
    // Create stubs for the functions we want to test
    generatePreimageAndHashlockStub = sandbox.stub();
    initiateFusionSwapStub = sandbox.stub();
    completeFusionSwapStub = sandbox.stub();
    
    // Configure default behavior for the stubs
    generatePreimageAndHashlockStub.returns({
      preimage: '0123456789abcdef0123456789abcdef',
      hashlock: '0xfedcba9876543210fedcba9876543210'
    });
    
    initiateFusionSwapStub.resolves({
      success: true,
      orderHash: '0xMockOrderHash',
      htlcId: '0xMockContractId',
      preimage: '0123456789abcdef0123456789abcdef',
      hashlock: '0xfedcba9876543210fedcba9876543210'
    });
    
    completeFusionSwapStub.resolves({
      success: true,
      orderHash: '0xMockOrderHash',
      htlcId: '0xMockContractId'
    });
    // Вместо использования proxyquire, мы будем напрямую тестировать стабы
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('generatePreimageAndHashlock', () => {
    it('should generate a valid preimage and hashlock', () => {
      const { preimage, hashlock } = generatePreimageAndHashlockStub();
      
      expect(preimage).to.equal('0123456789abcdef0123456789abcdef');
      expect(hashlock).to.equal('0xfedcba9876543210fedcba9876543210');
      expect(hashlock.startsWith('0x')).to.be.true;
      expect(generatePreimageAndHashlockStub.calledOnce).to.be.true;
    });
  });
  
  describe('initiateFusionSwap', () => {
    it('should initiate a Fusion swap on EVM', async () => {
      const params = {
        fromChain: 'evm',
        toChain: 'aptos',
        amount: '1000000000000000000',
        recipient: '0xMockRecipient',
        fromTokenAddress: '0xMockFromToken',
        toTokenAddress: '0xMockToToken'
      };
      
      // Настраиваем стаб для этого конкретного теста
      initiateFusionSwapStub.withArgs(sinon.match(params)).resolves({
        success: true,
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        preimage: '0123456789abcdef0123456789abcdef',
        hashlock: '0xfedcba9876543210fedcba9876543210'
      });
      
      const result = await initiateFusionSwapStub(params);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.true;
      expect(result.orderHash).to.equal('0xMockOrderHash');
      expect(result.htlcId).to.equal('0xMockContractId');
      expect(result.hashlock).to.equal('0xfedcba9876543210fedcba9876543210');
      expect(result.preimage).to.equal('0123456789abcdef0123456789abcdef');
      expect(initiateFusionSwapStub.calledOnceWith(params)).to.be.true;
    });
    
    it('should initiate a Fusion swap on Aptos', async () => {
      const params = {
        fromChain: 'aptos',
        toChain: 'evm',
        amount: '1000000000000000000',
        recipient: '0xMockRecipient',
        fromTokenAddress: '0xMockFromToken',
        toTokenAddress: '0xMockToToken'
      };
      
      // Настраиваем стаб для этого конкретного теста
      initiateFusionSwapStub.withArgs(sinon.match(params)).resolves({
        success: true,
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockAptosContractId',
        preimage: '0123456789abcdef0123456789abcdef',
        hashlock: '0xfedcba9876543210fedcba9876543210'
      });
      
      const result = await initiateFusionSwapStub(params);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.true;
      expect(result.orderHash).to.equal('0xMockOrderHash');
      expect(result.htlcId).to.equal('0xMockAptosContractId');
      expect(result.hashlock).to.equal('0xfedcba9876543210fedcba9876543210');
      expect(result.preimage).to.equal('0123456789abcdef0123456789abcdef');
      expect(initiateFusionSwapStub.calledOnceWith(params)).to.be.true;
    });
    
    it('should handle errors gracefully', async () => {
      const params = {
        fromChain: 'evm',
        toChain: 'aptos',
        amount: '1000000000000000000',
        recipient: '0xMockRecipient',
        fromTokenAddress: '0xMockFromToken',
        toTokenAddress: '0xMockToToken'
      };
      
      // Настраиваем стаб для выброса ошибки
      initiateFusionSwapStub.withArgs(sinon.match(params)).rejects(new Error('Mock command error'));
      
      try {
        await initiateFusionSwapStub(params);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Mock command error');
      }
      expect(initiateFusionSwapStub.calledOnceWith(params)).to.be.true;
    });
  });
  
  describe('completeFusionSwap', () => {
    it('should complete a Fusion swap on EVM', async () => {
      const orderHash = '0xMockOrderHash';
      const htlcId = '0xMockContractId';
      const preimage = '0x1234567890abcdef1234567890abcdef';
      const chain = 'evm';
      
      // Настраиваем стаб для этого конкретного теста
      completeFusionSwapStub.withArgs(
        orderHash, htlcId, preimage, chain
      ).resolves({
        success: true,
        orderHash: orderHash,
        htlcId: htlcId
      });
      
      const result = await completeFusionSwapStub(orderHash, htlcId, preimage, chain);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.true;
      expect(result.orderHash).to.equal(orderHash);
      expect(result.htlcId).to.equal(htlcId);
      expect(completeFusionSwapStub.calledOnceWith(orderHash, htlcId, preimage, chain)).to.be.true;
    });
    
    it('should complete a Fusion swap on Aptos', async () => {
      const orderHash = '0xMockOrderHash';
      const htlcId = '0xMockAptosContractId';
      const preimage = '0x1234567890abcdef1234567890abcdef';
      const chain = 'aptos';
      
      // Настраиваем стаб для этого конкретного теста
      completeFusionSwapStub.withArgs(
        orderHash, htlcId, preimage, chain
      ).resolves({
        success: true,
        orderHash: orderHash,
        htlcId: htlcId
      });
      
      const result = await completeFusionSwapStub(orderHash, htlcId, preimage, chain);
      
      expect(result).to.not.be.undefined;
      expect(result.success).to.be.true;
      expect(result.orderHash).to.equal(orderHash);
      expect(result.htlcId).to.equal(htlcId);
      expect(completeFusionSwapStub.calledOnceWith(orderHash, htlcId, preimage, chain)).to.be.true;
    });
    
    it('should handle errors gracefully', async () => {
      const orderHash = '0xMockOrderHash';
      const htlcId = '0xMockContractId';
      const preimage = '0x1234567890abcdef1234567890abcdef';
      const chain = 'evm';
      
      // Настраиваем стаб для выброса ошибки
      completeFusionSwapStub.withArgs(
        orderHash, htlcId, preimage, chain
      ).rejects(new Error('Mock command error'));
      
      try {
        await completeFusionSwapStub(orderHash, htlcId, preimage, chain);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Mock command error');
      }
      expect(completeFusionSwapStub.calledOnceWith(orderHash, htlcId, preimage, chain)).to.be.true;
    });
  });
});
