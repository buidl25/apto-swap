/**
 * CLI tool for executing Fusion HTLC cross-chain swaps
 */

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { initiateFusionSwap, completeFusionSwap, FusionSwapParams } from './fusion-htlc-swap';
import { formatTokenAmount } from './create-order';
import { getWalletAddress } from './sdk-setup';

// Load environment variables
dotenv.config();

// Create CLI program
const program = new Command();

program
  .name('fusion-htlc-cli')
  .description('CLI tool for executing Fusion HTLC cross-chain swaps')
  .version('1.0.0');

// Command to initiate a swap
program
  .command('initiate')
  .description('Initiate a Fusion HTLC cross-chain swap')
  .requiredOption('--from-chain <chain>', 'Source chain (evm or aptos)', /^(evm|aptos)$/i)
  .requiredOption('--to-chain <chain>', 'Destination chain (evm or aptos)', /^(evm|aptos)$/i)
  .requiredOption('--from-token <address>', 'Source token address')
  .requiredOption('--to-token <address>', 'Destination token address')
  .requiredOption('--amount <amount>', 'Amount to swap')
  .option('--decimals <decimals>', 'Token decimals', '18')
  .option('--recipient <address>', 'Recipient address (defaults to wallet address)')
  .option('--timelock <seconds>', 'Timelock in seconds from now (defaults to 30 minutes)')
  .action(async (options) => {
    try {
      console.log('=== Initiating Fusion HTLC Swap ===');
      
      // Format amount with correct decimals
      const formattedAmount = formatTokenAmount(options.amount, parseInt(options.decimals));
      
      // Prepare swap parameters
      let swapParams: FusionSwapParams = {
        fromChain: options.fromChain.toLowerCase() as 'evm' | 'aptos',
        toChain: options.toChain.toLowerCase() as 'evm' | 'aptos',
        fromTokenAddress: options.fromToken,
        toTokenAddress: options.toToken,
        amount: formattedAmount,
        recipient: options.recipient || getWalletAddress(),
      };
      
      // If timelock is provided, create a new object with the timelock value
      if (options.timelock) {
        const calculatedTimelock = Math.floor(Date.now() / 1000) + parseInt(options.timelock);
        swapParams = {
          ...swapParams,
          timelock: calculatedTimelock
        };
      }
      
      // Initiate the swap
      const result = await initiateFusionSwap(swapParams);
      
      if (result.success) {
        console.log('\n✅ Swap initiated successfully!');
        console.log('=== Swap Details ===');
        console.log(`Order Hash: ${result.orderHash}`);
        console.log(`HTLC ID: ${result.htlcId}`);
        console.log(`Preimage: ${result.preimage}`);
        console.log(`Hashlock: ${result.hashlock}`);
        console.log(`Timelock: ${new Date(result.timelock * 1000).toLocaleString()}`);
        
        console.log('\n📋 Save this information to complete the swap:');
        console.log(`ORDER_HASH=${result.orderHash}`);
        console.log(`HTLC_ID=${result.htlcId}`);
        console.log(`PREIMAGE=${result.preimage}`);
        console.log(`CHAIN=${swapParams.toChain}`);
      } else {
        console.error(`❌ Swap initiation failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  });

// Command to complete a swap
program
  .command('complete')
  .description('Complete a Fusion HTLC cross-chain swap')
  .requiredOption('--order-hash <hash>', 'Fusion order hash')
  .requiredOption('--htlc-id <id>', 'HTLC contract ID')
  .requiredOption('--preimage <preimage>', 'Preimage to unlock the HTLC')
  .requiredOption('--chain <chain>', 'Chain where the HTLC is deployed (evm or aptos)', /^(evm|aptos)$/i)
  .action(async (options) => {
    try {
      console.log('=== Completing Fusion HTLC Swap ===');
      
      // Complete the swap
      const result = await completeFusionSwap(
        options.orderHash,
        options.htlcId,
        options.preimage,
        options.chain.toLowerCase() as 'evm' | 'aptos'
      );
      
      if (result.success) {
        console.log('\n✅ Swap completed successfully!');
      } else {
        console.error(`❌ Swap completion failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  });

/**
 * Parse command line arguments
 * Exported as a function to make testing easier
 */
export function parseArgs(): void {
  program.parse();
}

// Only parse arguments when this file is run directly (not imported)
if (require.main === module) {
  parseArgs();
}
