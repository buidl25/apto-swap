/**
 * Unit tests for the swap monitoring module
 */
import { expect } from 'chai';
import sinon from 'sinon';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { monitorSwap, getAptosHtlcStatus, getEvmHtlcStatus } from '../../scripts/fusion/monitor-swap';

// Load environment variables
dotenv.config();

describe('Swap Monitoring', () => {
  // Sandbox for sinon stubs
  let sandbox: sinon.SinonSandbox;
  let execSyncStub: sinon.SinonStub;
  let setTimeoutStub: sinon.SinonStub;
  
  // Mock environment variables
  const mockEnv = {
    APTOS_MODULE_ADDRESS: '0xMockAptosModuleAddress',
    EVM_HTLC_ADDRESS: '0xMockEvmHtlcAddress'
  };
  
  // Mock order status response
  const mockOrderStatus = {
    status: 'filled',
    filledAmount: '1000000000000000000',
    settlement: '0xMockSettlementAddress'
  };
  
  // Mock HTLC status responses
  const mockAptosHtlcOutput = `
    sender: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
    recipient: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678
    amount: 1000000
    hashlock: 0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba
    timelock: 1625097600
    withdrawn: true
    refunded: false
  `;
  
  const mockEvmHtlcOutput = JSON.stringify({
    exists: true,
    sender: '0x1234567890abcdef1234567890abcdef12345678',
    recipient: '0xabcdef1234567890abcdef1234567890abcdef12',
    tokenAddress: '0x0123456789abcdef0123456789abcdef01234567',
    amount: '1000000000000000000',
    hashlock: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    timelock: '1625097600',
    withdrawn: false,
    refunded: false
  });
  
  beforeEach(() => {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Stub process.env
    Object.keys(mockEnv).forEach(key => {
      sandbox.stub(process.env, key).value(mockEnv[key as keyof typeof mockEnv]);
    });
    
    // Stub execSync - using a different approach to avoid 'Cannot stub non-existent property require' error
    const childProcess = require('child_process');
    execSyncStub = sandbox.stub(childProcess, 'execSync');
    execSyncStub.callsFake((command: string) => {
      if (command.includes('aptos move view')) {
        return Buffer.from(mockAptosHtlcOutput);
      }
      if (command.includes('npx hardhat run')) {
        return Buffer.from(mockEvmHtlcOutput);
      }
      return Buffer.from('Mock command output');
    });
    
    // Stub setTimeout to execute callback immediately
    setTimeoutStub = sandbox.stub(global, 'setTimeout');
    setTimeoutStub.callsFake((callback: Function) => {
      callback();
      return {} as any;
    });
    
    // Mock getOrderStatus directly
    const executeOrderModule = require('../../scripts/fusion/execute-order');
    sandbox.stub(executeOrderModule, 'getOrderStatus').resolves(mockOrderStatus);
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('getAptosHtlcStatus', () => {
    it('should parse Aptos HTLC status correctly', async () => {
      const status = await getAptosHtlcStatus('0xMockContractId');
      
      expect(status).to.not.be.undefined;
      expect(status.exists).to.be.true;
      expect(status.sender).to.equal('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      expect(status.recipient).to.equal('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678');
      expect(status.amount).to.equal('1000000');
      expect(status.hashlock).to.equal('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba');
      expect(status.timelock).to.equal(1625097600);
      expect(status.withdrawn).to.be.true;
      expect(status.refunded).to.be.false;
      
      // Verify that execSync was called with the correct command
      expect(execSyncStub.calledOnce).to.be.true;
      const command = execSyncStub.firstCall.args[0] as string;
      expect(command).to.include('aptos move view');
      expect(command).to.include('--function-id');
      expect(command).to.include('get_htlc_info');
      expect(command).to.include('MockContractId'); // Without 0x prefix
    });
    
    it('should handle non-existent HTLC', async () => {
      // Mock console.error to prevent error output during tests
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      // Make execSync throw an error with specific message
      execSyncStub.throws({
        message: 'Error: Transaction failed with code E_CONTRACT_NOT_EXISTS',
        stdout: '',
        stderr: 'E_CONTRACT_NOT_EXISTS'
      });
      
      const status = await getAptosHtlcStatus('0xNonExistentId');
      
      expect(status).to.not.be.undefined;
      expect(status.exists).to.be.false;
      
      // Verify console.error was called
      expect(consoleErrorStub.called).to.be.true;
      
      // Restore console.error
      consoleErrorStub.restore();
    });
    
    it('should propagate other errors', async () => {
      // Mock console.error to prevent error output during tests
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      // Make execSync throw a different error
      execSyncStub.throws(new Error('Mock command error'));
      
      let thrownError: Error | null = null;
      try {
        await getAptosHtlcStatus('0xMockContractId');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        thrownError = error;
      }
      
      // Verify the error was thrown and contains the expected message
      expect(thrownError).to.not.be.null;
      expect(thrownError!.message).to.equal('Mock command error');
      
      // Verify console.error was called
      expect(consoleErrorStub.called).to.be.true;
      
      // Restore console.error
      consoleErrorStub.restore();
    });
  });
  
  describe('getEvmHtlcStatus', () => {
    it('should parse EVM HTLC status correctly', async () => {
      const status = await getEvmHtlcStatus('0xMockContractId');
      
      expect(status).to.not.be.undefined;
      expect(status.exists).to.be.true;
      expect(status.sender).to.equal('0x1234567890abcdef1234567890abcdef12345678');
      expect(status.recipient).to.equal('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(status.tokenAddress).to.equal('0x0123456789abcdef0123456789abcdef01234567');
      expect(status.amount).to.equal('1000000000000000000');
      expect(status.hashlock).to.equal('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba');
      expect(status.timelock).to.equal('1625097600');
      expect(status.withdrawn).to.be.false;
      expect(status.refunded).to.be.false;
      
      // Verify that execSync was called with the correct command
      expect(execSyncStub.calledOnce).to.be.true;
      const command = execSyncStub.firstCall.args[0] as string;
      expect(command).to.include('npx hardhat run');
      expect(command).to.include('getHtlcStatus');
      expect(command).to.include('0xMockContractId');
    });
    
    it('should handle command execution errors', async () => {
      // Mock console.error to prevent error output during tests
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      // Make execSync throw an error
      execSyncStub.throws(new Error('Mock command error'));
      
      let thrownError: Error | null = null;
      try {
        await getEvmHtlcStatus('0xMockContractId');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        thrownError = error;
      }
      
      // Verify the error was thrown and contains the expected message
      expect(thrownError).to.not.be.null;
      expect(thrownError!.message).to.include('Mock command error');
      
      // Verify console.error was called
      expect(consoleErrorStub.called).to.be.true;
      
      // Restore console.error
      consoleErrorStub.restore();
    });
  });
  
  describe('monitorSwap', () => {
    it('should monitor a swap and return statuses', async () => {
      // For this test, we want to make sure the HTLC is not withdrawn yet
      // so that we get multiple status checks
      execSyncStub.callsFake((command: string) => {
        if (command.includes('aptos move view')) {
          return Buffer.from(
            'sender: 0xMockSender\n' +
            'recipient: 0xMockRecipient\n' +
            'amount: 1000000000000000000\n' +
            'hashlock: 0xMockHashlock\n' +
            'timelock: 1625112000\n' +
            'withdrawn: false\n' +
            'refunded: false'
          );
        } else if (command.includes('npx hardhat run')) {
          return Buffer.from(JSON.stringify({
            exists: true,
            sender: '0xMockSender',
            recipient: '0xMockRecipient',
            amount: '1000000000000000000',
            hashlock: '0xMockHashlock',
            timelock: '1625112000',
            withdrawn: false,
            refunded: false
          }));
        }
        return Buffer.from('Mock command output');
      });
      
      const params = {
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        chain: 'aptos' as const,
        pollInterval: 100,
        maxAttempts: 3
      };
      
      const statuses = await monitorSwap(params);
      
      expect(statuses).to.be.an('array');
      expect(statuses.length).to.equal(3); // Should run for all maxAttempts
      
      // Check the first status
      const firstStatus = statuses[0];
      expect(firstStatus.orderStatus).to.deep.equal(mockOrderStatus);
      expect(firstStatus.htlcStatus.exists).to.be.true;
      expect(firstStatus.htlcStatus.withdrawn).to.be.false; // We mocked withdrawn as false
      expect(firstStatus.timestamp).to.be.a('number');
      
      // Verify that setTimeout was called for polling
      expect(setTimeoutStub.called).to.be.true; // Called for polling
    });
    
    it('should stop monitoring when swap is complete', async function() {
      // Set a shorter timeout for this test
      this.timeout(5000);
      
      // Reset sandbox to avoid double stubbing
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      // Re-stub console methods
      sandbox.stub(console, 'log');
      sandbox.stub(console, 'error');
      sandbox.stub(console, 'warn');
      
      // Re-stub execSync with withdrawn=true to indicate completion
      const childProcess = require('child_process');
      execSyncStub = sandbox.stub(childProcess, 'execSync');
      execSyncStub.callsFake((command: string) => {
        if (command.includes('aptos move view')) {
          return Buffer.from(
            'sender: 0xMockSender\n' +
            'recipient: 0xMockRecipient\n' +
            'amount: 1000000000000000000\n' +
            'hashlock: 0xMockHashlock\n' +
            'timelock: 1625112000\n' +
            'withdrawn: true\n' +
            'refunded: false'
          );
        } else if (command.includes('npx hardhat run')) {
          return Buffer.from(JSON.stringify({
            exists: true,
            sender: '0xMockSender',
            recipient: '0xMockRecipient',
            amount: '1000000000000000000',
            hashlock: '0xMockHashlock',
            timelock: '1625112000',
            withdrawn: true,
            refunded: false
          }));
        }
        return Buffer.from('Mock command output');
      });
      
      // Re-stub setTimeout to execute callback immediately
      setTimeoutStub = sandbox.stub(global, 'setTimeout');
      setTimeoutStub.callsFake((callback: Function) => {
        callback();
        return {} as any;
      });
      
      // Re-stub getOrderStatus
      const executeOrderModule = require('../../scripts/fusion/execute-order');
      sandbox.stub(executeOrderModule, 'getOrderStatus').resolves(mockOrderStatus);
      
      const params = {
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        chain: 'aptos' as const,
        pollInterval: 100,
        maxAttempts: 5
      };
      
      const statuses = await monitorSwap(params);
      
      expect(statuses).to.be.an('array');
      expect(statuses).to.have.lengthOf(1); // Should stop after first check
      
      // Since we're mocking the HTLC status to show withdrawn=true, the monitoring should stop after 1 attempt
      expect(statuses.length).to.equal(1);
    });
    
    it('should handle missing order hash', async () => {
      // Reset the stubs to ensure clean state
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      // Re-stub execSync
      const childProcess = require('child_process');
      execSyncStub = sandbox.stub(childProcess, 'execSync');
      execSyncStub.callsFake((command: string) => {
        if (command.includes('aptos move view')) {
          return Buffer.from(mockAptosHtlcOutput);
        }
        return Buffer.from('Mock command output');
      });
      
      // Re-stub setTimeout
      setTimeoutStub = sandbox.stub(global, 'setTimeout');
      setTimeoutStub.callsFake((callback: Function) => {
        callback();
        return {} as any;
      });
      
      const params = {
        htlcId: '0xMockContractId',
        chain: 'aptos' as const
      };
      
      const statuses = await monitorSwap(params);
      
      expect(statuses).to.be.an('array');
      expect(statuses[0].orderStatus).to.be.undefined;
      expect(statuses[0].htlcStatus.exists).to.be.true;
    });
    
    it('should handle order status errors gracefully', async () => {
      // Reset the stubs to ensure clean state
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      // Re-stub console methods
      sandbox.stub(console, 'log');
      sandbox.stub(console, 'error');
      sandbox.stub(console, 'warn');
      
      // Re-stub execSync
      const childProcess = require('child_process');
      execSyncStub = sandbox.stub(childProcess, 'execSync');
      execSyncStub.callsFake((command: string) => {
        if (command.includes('aptos move view')) {
          return Buffer.from(mockAptosHtlcOutput);
        } else if (command.includes('npx hardhat run')) {
          return Buffer.from(JSON.stringify({
            exists: false
          }));
        }
        return Buffer.from('Mock command output');
      });
      
      // Re-stub setTimeout to execute callback immediately
      setTimeoutStub = sandbox.stub(global, 'setTimeout');
      setTimeoutStub.callsFake((callback: Function) => {
        callback();
        return {} as any;
      });
      
      // Stub getOrderStatus to throw an error
      const executeOrderModule = require('../../scripts/fusion/execute-order');
      sandbox.stub(executeOrderModule, 'getOrderStatus').rejects(new Error('Mock order status error'));
      
      const params = {
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        chain: 'evm' as const,
        pollInterval: 100,
        maxAttempts: 1
      };
      
      const statuses = await monitorSwap(params);
      
      expect(statuses).to.be.an('array');
      expect(statuses).to.have.lengthOf(1);
      
      // Check that the status has no order status and HTLC status shows it doesn't exist
      const status = statuses[0];
      expect(status.orderStatus).to.be.undefined;
      expect(status.htlcStatus.exists).to.be.false;
      
      // Verify that console.warn was called for the order status error
      const consoleWarn = console.warn as sinon.SinonStub;
      expect(consoleWarn.called).to.be.true;
      expect(consoleWarn.args.some(args => 
        args[0].includes('Failed to get order status')
      )).to.be.true;
    });
    
    it('should handle HTLC status errors gracefully', async () => {
      // Mock console.error to prevent error output during tests
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      // Make execSync throw an error
      execSyncStub.throws(new Error('Mock HTLC status error'));
      
      const params = {
        orderHash: '0xMockOrderHash',
        htlcId: '0xMockContractId',
        chain: 'evm' as const,
        pollInterval: 100,
        maxAttempts: 1
      };
      
      const statuses = await monitorSwap(params);
      
      expect(statuses).to.be.an('array');
      expect(statuses).to.have.lengthOf(1);
      
      // Check that the status has order status but HTLC status shows not exists
      const status = statuses[0];
      expect(status.orderStatus).to.deep.equal(mockOrderStatus);
      expect(status.htlcStatus.exists).to.be.false;
      
      // Verify console.error was called
      expect(consoleErrorStub.called).to.be.true;
      
      // Restore console.error
      consoleErrorStub.restore();
    });
  });
});
