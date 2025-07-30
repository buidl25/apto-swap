/**
 * Example script demonstrating the usage of 1inch Fusion integration
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { createFusionSdk, getWalletAddress } from './sdk-setup';
import { createOrder, formatTokenAmount } from './create-order';
import { submitOrder, getOrderStatus, waitForOrderCompletion, formatOrderStatus } from './execute-order';
import { initiateFusionSwapWithHtlc, generatePreimageAndHashlock } from './cross-chain-swap';

// Load environment variables
dotenv.config();

/**
 * Main function to demonstrate Fusion SDK usage
 */
async function main(): Promise<void> {
  try {
    console.log('1inch Fusion SDK Example');
    console.log('------------------------\n');

    // Initialize SDK
    const sdk = createFusionSdk();
    console.log('✅ Fusion SDK initialized');

    // Get wallet address from private key
    const walletAddress = getWalletAddress();
    console.log(`🔑 Using wallet: ${walletAddress}`);

    // Example token addresses (ETH and USDC on Ethereum)
    const fromTokenAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // ETH
    const toTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';   // USDC
    
    // Format amount (0.01 ETH)
    const amount = formatTokenAmount(0.01, 18);
    console.log(`💰 Swapping ${ethers.formatEther(amount)} ETH to USDC`);

    // Example 1: Simple order creation
    console.log('\n📝 Creating a Fusion order...');
    const orderInfo = await createOrder({
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
    });
    
    console.log('Order created:');
    console.log(`- Quote ID: ${orderInfo.quoteId}`);
    console.log(`- From: ${orderInfo.order.makerAsset}`);
    console.log(`- To: ${orderInfo.order.takerAsset}`);
    console.log(`- Amount: ${orderInfo.order.makingAmount}`);

    // Example 2: Submit order
    console.log('\n📤 Submitting order to 1inch Fusion API...');
    const submitResponse = await submitOrder(orderInfo);
    
    if (submitResponse.orderHash) {
      console.log(`✅ Order submitted successfully!`);
      console.log(`- Order Hash: ${submitResponse.orderHash}`);
      
      // Example 3: Check order status
      console.log('\n🔍 Checking order status...');
      const status = await getOrderStatus(submitResponse.orderHash);
      console.log(formatOrderStatus(status));
      
      // Note: In a real application, you would wait for the order to be filled
      console.log('\n⏳ In a production environment, you would monitor the order until filled or expired');
    } else {
      console.log(`❌ Order submission failed: ${submitResponse.message}`);
    }

    // Example 4: Cross-chain swap with HTLC
    console.log('\n🔄 Initiating cross-chain swap with HTLC...');
    
    // Generate preimage and hashlock
    const { preimage, hashlock } = generatePreimageAndHashlock();
    console.log(`- Preimage: ${preimage}`);
    console.log(`- Hashlock: ${hashlock}`);
    
    // Initiate swap
    const swapResult = await initiateFusionSwapWithHtlc({
      fromChain: 'evm',
      toChain: 'aptos',
      fromTokenAddress,
      toTokenAddress,
      amount,
      recipient: walletAddress,
      preimage,
    });
    
    if (swapResult.success) {
      console.log('✅ Cross-chain swap initiated successfully!');
      console.log(`- Order Hash: ${swapResult.orderHash}`);
      console.log(`- Hashlock: ${swapResult.hashlock}`);
      console.log(`- Timelock: ${new Date(swapResult.timelock * 1000).toLocaleString()}`);
    } else {
      console.log(`❌ Cross-chain swap initiation failed: ${swapResult.error}`);
    }
    
    console.log('\n🎉 Example completed!');
    
  } catch (error) {
    console.error('Error in example script:', error);
  }
}

// Run the example
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
