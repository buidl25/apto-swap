/**
 * Monitor Cross-Chain Swap Status
 * 
 * This script monitors the status of a cross-chain swap by tracking both
 * the 1inch Fusion order status and the HTLC status on both chains.
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { AptosClient } from 'aptos';
import { getOrderStatus } from './execute-order';

// Load environment variables
dotenv.config();

/**
 * Parameters for monitoring a cross-chain swap
 */
export interface MonitorSwapParams {
  readonly orderHash?: string;
  readonly htlcId: string;
  readonly chain: 'evm' | 'aptos';
  readonly pollInterval?: number; // in milliseconds
  readonly maxAttempts?: number;
}

/**
 * Status of an HTLC on the Aptos blockchain
 */
export interface AptosHtlcStatus {
  readonly exists: boolean;
  readonly sender?: string;
  readonly recipient?: string;
  readonly amount?: string;
  readonly hashlock?: string;
  readonly timelock?: number;
  readonly withdrawn?: boolean;
  readonly refunded?: boolean;
}

/**
 * Status of an HTLC on the EVM blockchain
 */
export interface EvmHtlcStatus {
  readonly exists: boolean;
  readonly sender?: string;
  readonly recipient?: string;
  readonly tokenAddress?: string;
  readonly amount?: string;
  readonly hashlock?: string;
  readonly timelock?: number;
  readonly withdrawn?: boolean;
  readonly refunded?: boolean;
}

/**
 * Combined status of a cross-chain swap
 */
export interface SwapStatus {
  readonly orderStatus?: {
    readonly status: string;
    readonly filledAmount?: string;
    readonly settlement?: string | { [key: string]: any; tx: string };
  };
  readonly htlcStatus: AptosHtlcStatus | EvmHtlcStatus;
  readonly timestamp: number;
}

/**
 * Executes an Aptos CLI command and returns the output
 * @param command - The command to execute
 * @returns Command output
 */
function executeAptosCommand(command: string): string {
  try {
    const output = execSync(`aptos ${command}`, { encoding: 'utf-8' });
    return output;
  } catch (error: any) {
    console.error(`Error executing Aptos command: ${error.message}`);
    if (error.stdout) console.error(`Command output: ${error.stdout}`);
    if (error.stderr) console.error(`Command error: ${error.stderr}`);
    throw error;
  }
}

/**
 * Gets the status of an HTLC on the Aptos blockchain
 * @param htlcId - The ID of the HTLC
 * @returns Promise resolving to the HTLC status
 */
export async function getAptosHtlcStatus(htlcId: string): Promise<AptosHtlcStatus> {
  try {
    const moduleAddress = process.env.APTOS_MODULE_ADDRESS || 
      '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
    
    // Format the contract ID properly (remove 0x prefix for hex argument)
    const formattedContractId = htlcId.replace(/^0x/, '');
    
    const command = `move view \
      --function-id ${moduleAddress}::atomic_swap::get_htlc_info \
      --type-args ${moduleAddress}::test_aptos_token::TestAptosToken \
      --args hex:${formattedContractId}`;
    
    const output = executeAptosCommand(command);
    
    // Ensure output is a string
    const outputStr = output.toString();
    
    // Parse the output to extract HTLC information
    // This is a simplified version - in production, you'd want more robust parsing
    const senderMatch = outputStr.match(/sender: ([0-9a-fx]+)/i);
    const recipientMatch = outputStr.match(/recipient: ([0-9a-fx]+)/i);
    const amountMatch = outputStr.match(/amount: (\d+)/i);
    const hashlockMatch = outputStr.match(/hashlock: ([0-9a-fx]+)/i);
    const timelockMatch = outputStr.match(/timelock: (\d+)/i);
    const withdrawnMatch = outputStr.match(/withdrawn: (true|false)/i);
    const refundedMatch = outputStr.match(/refunded: (true|false)/i);
    
    return {
      exists: true,
      sender: senderMatch ? senderMatch[1] : undefined,
      recipient: recipientMatch ? recipientMatch[1] : undefined,
      amount: amountMatch ? amountMatch[1] : undefined,
      hashlock: hashlockMatch ? hashlockMatch[1] : undefined,
      timelock: timelockMatch ? parseInt(timelockMatch[1]) : undefined,
      withdrawn: withdrawnMatch ? withdrawnMatch[1] === 'true' : undefined,
      refunded: refundedMatch ? refundedMatch[1] === 'true' : undefined,
    };
  } catch (error: any) {
    // If the HTLC doesn't exist, return exists: false
    if (error.message.includes('E_CONTRACT_NOT_EXISTS')) {
      return { exists: false };
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Gets the status of an HTLC on the EVM blockchain
 * @param htlcId - The ID of the HTLC
 * @returns Promise resolving to the HTLC status
 */
export async function getEvmHtlcStatus(htlcId: string): Promise<EvmHtlcStatus> {
  // In a real implementation, you would use ethers.js to call the HTLC contract
  // For now, we'll use a simplified approach
  
  // Use hardhat to run a script that gets the HTLC status
  const command = `npx hardhat run --network localhost -e "
    async function getHtlcStatus() {
      const htlcAddress = process.env.EVM_HTLC_ADDRESS;
      if (!htlcAddress) {
        console.error('EVM_HTLC_ADDRESS not set');
        return JSON.stringify({ exists: false });
      }
      
      const htlc = await ethers.getContractAt('EthereumHTLC', htlcAddress);
      try {
        const htlcInfo = await htlc.getHTLC('${htlcId}');
        return JSON.stringify({
          exists: true,
          sender: htlcInfo.sender,
          recipient: htlcInfo.recipient,
          tokenAddress: htlcInfo.tokenContract,
          amount: htlcInfo.amount.toString(),
          hashlock: htlcInfo.hashlock,
          timelock: htlcInfo.timelock.toString(),
          withdrawn: htlcInfo.withdrawn,
          refunded: htlcInfo.refunded
        });
      } catch (error) {
        return JSON.stringify({ exists: false });
      }
    }
    
    getHtlcStatus().then(result => console.log(result));
  "`;
  
  try {
    const output = execSync(command);
    // Ensure output is a string
    const outputStr = output.toString().trim();
    return JSON.parse(outputStr);
  } catch (error: any) {
    console.error('Error getting EVM HTLC status:', error.message);
    // Propagate the error instead of returning a default value
    throw error;
  }
}

/**
 * Monitors the status of a cross-chain swap
 * @param params - Parameters for monitoring the swap
 * @returns Promise resolving to an array of swap statuses over time
 */
export async function monitorSwap(
  params: MonitorSwapParams
): Promise<SwapStatus[]> {
  const pollInterval = params.pollInterval || 5000; // Default: 5 seconds
  const maxAttempts = params.maxAttempts || 12; // Default: 12 attempts (1 minute with 5s interval)
  
  console.log('=== Monitoring Cross-Chain Swap ===');
  console.log(`Order Hash: ${params.orderHash || 'N/A'}`);
  console.log(`HTLC ID: ${params.htlcId}`);
  console.log(`Chain: ${params.chain}`);
  console.log(`Poll Interval: ${pollInterval}ms`);
  console.log(`Max Attempts: ${maxAttempts}`);
  
  const statuses: SwapStatus[] = [];
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\nAttempt ${attempt}/${maxAttempts}...`);
    
    // Get Fusion order status if order hash is provided
    let orderStatus;
    if (params.orderHash) {
      try {
        console.log('Getting Fusion order status...');
        const status = await getOrderStatus(params.orderHash);
        orderStatus = {
          status: status.status,
          filledAmount: status.filledAmount,
          settlement: status.settlement,
        };
        console.log(`Order status: ${status.status}`);
      } catch (error: any) {
        console.warn(`Warning: Failed to get order status - ${error.message}`);
      }
    }
    
    // Get HTLC status
    let htlcStatus;
    try {
      console.log('Getting HTLC status...');
      if (params.chain === 'aptos') {
        htlcStatus = await getAptosHtlcStatus(params.htlcId);
      } else {
        htlcStatus = await getEvmHtlcStatus(params.htlcId);
      }
      
      if (htlcStatus.exists) {
        console.log('HTLC exists:');
        console.log(`- Withdrawn: ${htlcStatus.withdrawn}`);
        console.log(`- Refunded: ${htlcStatus.refunded}`);
        console.log(`- Timelock: ${htlcStatus.timelock ? new Date(htlcStatus.timelock * 1000).toLocaleString() : 'N/A'}`);
      } else {
        console.log('HTLC does not exist or has been fully processed');
      }
    } catch (error: any) {
      console.warn(`Warning: Failed to get HTLC status - ${error.message}`);
      htlcStatus = { exists: false };
    }
    
    // Record the status
    const status: SwapStatus = {
      orderStatus,
      htlcStatus,
      timestamp: Date.now(),
    };
    
    statuses.push(status);
    
    // Check if the swap is complete
    if (
      (orderStatus && orderStatus.status === 'filled') &&
      (htlcStatus.withdrawn || htlcStatus.refunded || !htlcStatus.exists)
    ) {
      console.log('\n✅ Swap appears to be complete!');
      break;
    }
    
    // Wait for the next poll interval if not the last attempt
    if (attempt < maxAttempts) {
      console.log(`Waiting ${pollInterval / 1000} seconds before next check...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  return statuses;
}

/**
 * Main function to demonstrate swap monitoring
 */
async function main(): Promise<void> {
  try {
    // Get parameters from command line arguments or environment variables
    const orderHash = process.argv[2] || process.env.ORDER_HASH;
    const htlcId = process.argv[3] || process.env.HTLC_ID;
    const chain = (process.argv[4] || process.env.CHAIN || 'evm').toLowerCase() as 'evm' | 'aptos';
    
    if (!htlcId) {
      console.error('Error: HTLC ID is required');
      console.log('Usage: npm run monitor-swap -- <orderHash> <htlcId> <chain>');
      process.exit(1);
    }
    
    // Monitor the swap
    const statuses = await monitorSwap({
      orderHash,
      htlcId,
      chain,
      pollInterval: 5000,
      maxAttempts: 12,
    });
    
    // Print a summary
    console.log('\n=== Swap Monitoring Summary ===');
    console.log(`Total status checks: ${statuses.length}`);
    
    const lastStatus = statuses[statuses.length - 1];
    console.log('\nFinal status:');
    console.log(`- Order status: ${lastStatus.orderStatus?.status || 'N/A'}`);
    console.log(`- HTLC exists: ${lastStatus.htlcStatus.exists}`);
    
    if (lastStatus.htlcStatus.exists) {
      console.log(`- HTLC withdrawn: ${lastStatus.htlcStatus.withdrawn}`);
      console.log(`- HTLC refunded: ${lastStatus.htlcStatus.refunded}`);
    }
    
    // Determine overall status
    let overallStatus = 'Incomplete';
    if (
      (lastStatus.orderStatus?.status === 'filled') &&
      (lastStatus.htlcStatus.withdrawn || !lastStatus.htlcStatus.exists)
    ) {
      overallStatus = 'Complete - Successful';
    } else if (lastStatus.htlcStatus.refunded) {
      overallStatus = 'Complete - Refunded';
    }
    
    console.log(`\nOverall swap status: ${overallStatus}`);
    
  } catch (error: any) {
    console.error('Error in main:', error.message);
  }
}

// Execute the main function if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default {
  monitorSwap,
  getAptosHtlcStatus,
  getEvmHtlcStatus,
};
