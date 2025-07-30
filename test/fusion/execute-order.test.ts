/**
 * Unit tests for the Fusion order execution module
 */
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as dotenv from 'dotenv';
import { submitOrder, getOrderStatus, waitForOrderCompletion } from '../../scripts/fusion/execute-order';
import * as sdkSetup from '../../scripts/fusion/sdk-setup';
import * as proxyquire from 'proxyquire';

// Load environment variables
dotenv.config();

describe('Fusion Order Execution', () => {
  // Sandbox for sinon stubs
  let sandbox: sinon.SinonSandbox;
  
  // Mock SDK
  const mockSdk = {
    submitOrder: sinon.stub().resolves({
      orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      status: 'submitted'
    }),
    getOrderStatus: sinon.stub().resolves({
      status: 'filled',
      filledAmount: '1000000000000000000',
      settlement: {
        tx: '0xMockSettlementAddress'
      }
    }),
    getOrdersByMaker: sinon.stub().resolves({
      items: [
        {
          orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
          status: 'filled'
        },
        {
          orderHash: '0x2345678901234567890123456789012345678901234567890123456789012345',
          status: 'open'
        }
      ]
    })
  };
  
  // Mock order data
  const mockOrder = {
    orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    signature: '0xMockSignature',
    quoteId: '0xMockQuoteId',
    order: {
      makerAsset: '0xMockMakerAsset',
      takerAsset: '0xMockTakerAsset',
      makingAmount: '1000000000000000000',
      takingAmount: '1000000000',
      maker: '0xMockMakerAddress'
    }
  };
  
  beforeEach(() => {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Stub setTimeout to avoid waiting in tests
    sandbox.stub(global, 'setTimeout').callsFake((callback) => {
      callback();
      return {} as any;
    });
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('submitOrder', () => {
    it('should submit an order successfully', async () => {
      // Mock createFusionSdk to return our mockSdk
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(mockSdk as any);
      
      // Override the mock response for this specific test
      mockSdk.submitOrder.resolves({
        orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        status: 'submitted'
      });
      
      const result = await submitOrder(mockOrder);
      
      expect(result).to.not.be.undefined;
      expect(result.status).to.equal('submitted');
      expect(result.orderHash).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
      
      // Verify that the SDK method was called with correct parameters
      expect(mockSdk.submitOrder.calledOnce).to.be.true;
      expect(mockSdk.submitOrder.firstCall.args[0]).to.equal(mockOrder.order);
      expect(mockSdk.submitOrder.firstCall.args[1]).to.equal(mockOrder.quoteId);
      
      // Restore the original function
      createFusionSdkStub.restore();
    });
    
    it('should handle case when SDK is not initialized', async () => {
      // Mock createFusionSdk to return null
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(null as any);
      
      try {
        await submitOrder(mockOrder);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to initialize Fusion SDK');
      }
      
      // Restore the original function
      createFusionSdkStub.restore();
    });
    
    it('should handle invalid order', async () => {
      // Mock createFusionSdk to return our mockSdk
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(mockSdk as any);
      
      // Make the SDK throw an error for invalid order
      mockSdk.submitOrder.rejects(new Error('Invalid order'));
      
      // Invalid order without signature
      const invalidOrder = { ...mockOrder, signature: '' };
      
      const result = await submitOrder(invalidOrder);
      
      expect(result.status).to.equal('failed');
      expect(result.message).to.equal('Invalid order: signature is required');
      
      // Restore the original function
      createFusionSdkStub.restore();
    });
    
    it('should handle SDK errors gracefully', async () => {
      // Mock createFusionSdk to return our mockSdk
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(mockSdk as any);
      
      // Mock console.error to prevent error output during tests
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      // Make the SDK throw an error
      mockSdk.submitOrder.rejects(new Error('Mock SDK error'));
      
      const result = await submitOrder(mockOrder);
      
      // Verify the result contains the expected error information
      expect(result.status).to.equal('failed');
      expect(result.message).to.equal('Mock SDK error');
      
      // Verify console.error was called
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Error submitting Fusion order:');
      
      // Restore the original function and console.error
      createFusionSdkStub.restore();
      consoleErrorStub.restore();
    });
  });
  
  describe('getOrderStatus', () => {
    it('should get order status successfully', async () => {
      // Mock createFusionSdk to return our mockSdk
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(mockSdk as any);
      
      // Use a valid hash format that matches our validation requirements
      const validOrderHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      const result = await getOrderStatus(validOrderHash);
      
      expect(result).to.not.be.undefined;
      expect(result.status).to.equal('filled');
      expect(result.filledAmount).to.equal('1000000000000000000');
      expect(result.settlement?.tx).to.equal('0xMockSettlementAddress');
      
      // Verify that the SDK method was called with correct parameters
      expect(mockSdk.getOrderStatus.calledOnce).to.be.true;
      expect(mockSdk.getOrderStatus.firstCall.args[0]).to.equal(validOrderHash);
      
      // Restore the original function
      createFusionSdkStub.restore();
    });
    
    it('should throw an error if SDK is not initialized', async () => {
      // Mock createFusionSdk to return null
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(null as any);
      
      try {
        await getOrderStatus('0xMockOrderHash');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to initialize Fusion SDK');
      }
      
      // Restore the original function
      createFusionSdkStub.restore();
    });
    
    it('should throw an error if order hash is invalid', async () => {
      // Mock createFusionSdk to return our mockSdk
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(mockSdk as any);
      
      try {
        await getOrderStatus('');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Invalid order hash');
      }
      
      // Restore the original function
      createFusionSdkStub.restore();
    });
    
    it('should handle SDK errors gracefully', async () => {
      // Mock createFusionSdk to return our mockSdk
      const createFusionSdkStub = sandbox.stub(sdkSetup, 'createFusionSdk').returns(mockSdk as any);
      
      // Mock console.error to prevent error output during tests
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      // Make the SDK throw an error
      mockSdk.getOrderStatus.rejects(new Error('Mock SDK error'));
      
      let thrownError: Error | null = null;
      try {
        // Use a valid hash format to pass the validation
        await getOrderStatus('0x1234567890123456789012345678901234567890123456789012345678901234');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        thrownError = error;
      }
      
      // Verify the error was thrown and contains the expected message
      expect(thrownError).to.not.be.null;
      expect(thrownError!.message).to.equal('Mock SDK error');
      
      // Verify console.error was called
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Error getting order status:');
      
      // Restore the original function and console.error
      createFusionSdkStub.restore();
      consoleErrorStub.restore();
    });
  });
  
  describe('waitForOrderCompletion', () => {
    // Создаем модифицированную версию для тестов с меньшими таймаутами
    let testWaitForOrderCompletion: typeof waitForOrderCompletion;
    
    beforeEach(() => {
      // Сбрасываем историю вызовов моков перед каждым тестом
      mockSdk.getOrderStatus.resetHistory();
      
      // Создаем стаб для createFusionSdk
      sandbox.stub(sdkSetup, 'createFusionSdk').returns(mockSdk as any);
      
      // Создаем модифицированную версию функции для тестов
      testWaitForOrderCompletion = async (orderHash: string, pollIntervalMs = 10, timeoutMs = 100) => {
        return waitForOrderCompletion(orderHash, pollIntervalMs, timeoutMs);
      };
    });
    
    it('should wait for order completion when order is filled', async () => {
      // Настраиваем мок для возврата заполненного статуса сразу
      const filledResponse = {
        status: 'filled',
        filledAmount: '1000000000000000000',
        settlement: {
          tx: '0xMockSettlementAddress'
        }
      };
      mockSdk.getOrderStatus.resolves(filledResponse);
      
      // Вызываем функцию
      const result = await testWaitForOrderCompletion(
        '0x1234567890123456789012345678901234567890123456789012345678901234'
      );
      
      // Проверяем результат
      expect(result).to.deep.equal(filledResponse);
      
      // Проверяем, что getOrderStatus был вызван один раз
      expect(mockSdk.getOrderStatus.calledOnce).to.be.true;
    });
    
    it('should wait for order completion when order is initially open', async () => {
      // Настраиваем мок для возврата сначала открытого, а затем заполненного статуса
      mockSdk.getOrderStatus.onFirstCall().resolves({
        status: 'open',
        filledAmount: '0',
        settlement: null
      });
      
      const filledResponse = {
        status: 'filled',
        filledAmount: '1000000000000000000',
        settlement: {
          tx: '0xMockSettlementAddress'
        }
      };
      mockSdk.getOrderStatus.onSecondCall().resolves(filledResponse);
      
      // Переопределяем Date.now для контроля таймаута
      const dateNowStub = sandbox.stub(Date, 'now');
      dateNowStub.onFirstCall().returns(0); // Начальное время
      dateNowStub.onSecondCall().returns(0); // Первая проверка
      dateNowStub.onThirdCall().returns(50); // Вторая проверка
      
      // Вызываем функцию
      const result = await testWaitForOrderCompletion(
        '0x1234567890123456789012345678901234567890123456789012345678901234'
      );
      
      // Проверяем результат
      expect(result).to.deep.equal(filledResponse);
      
      // Проверяем, что getOrderStatus был вызван дважды
      expect(mockSdk.getOrderStatus.calledTwice).to.be.true;
      
      // Восстанавливаем оригинальную функцию
      dateNowStub.restore();
    });
    
    it('should throw an error when timeout is reached', async () => {
      // Настраиваем мок для всегда возвращения открытого статуса
      mockSdk.getOrderStatus.resolves({
        status: 'open',
        filledAmount: '0',
        settlement: null
      });
      
      // Переопределяем Date.now для симуляции таймаута
      const dateNowStub = sandbox.stub(Date, 'now');
      dateNowStub.onFirstCall().returns(0);  // Начальное время
      dateNowStub.onSecondCall().returns(0); // Первая проверка
      dateNowStub.returns(200);              // Превышаем таймаут в 100мс
      
      // Проверяем, что функция выбрасывает ошибку
      try {
        await testWaitForOrderCompletion(
          '0x1234567890123456789012345678901234567890123456789012345678901234'
        );
        expect.fail('Должна была быть выброшена ошибка таймаута');
      } catch (error: any) {
        expect(error.message).to.include('timed out');
      }
      
      // Проверяем, что getOrderStatus был вызван хотя бы один раз
      expect(mockSdk.getOrderStatus.called).to.be.true;
      
      // Восстанавливаем оригинальную функцию
      dateNowStub.restore();
    });
  });
});
