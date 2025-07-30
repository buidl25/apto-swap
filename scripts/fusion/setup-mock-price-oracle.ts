/**
 * Setup Mock Price Oracle
 * 
 * This script demonstrates the mock price oracle functionality for 1inch Fusion Dutch auctions.
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { MockPriceOracle } from './mock-price-oracle';

/**
 * Main function to set up and test the mock price oracle
 */
async function main(): Promise<void> {
  console.log('=== Setting up Mock Price Oracle for 1inch Fusion ===');
  
  // Create a mock price oracle with default settings
  const oracle = new MockPriceOracle({
    initialPrice: ethers.parseEther('1.05').toString(), // 5% premium
    finalPrice: ethers.parseEther('0.98').toString(),   // 2% discount
    duration: 180, // 3 minutes
    decayModel: 'linear'
  });
  
  console.log('\nGenerating price points for a Dutch auction...');
  const pricePoints = oracle.generatePricePoints(10);
  
  // Display the price points
  console.log('\nPrice Points:');
  console.log('Timestamp | Price (ETH) | Time');
  console.log('--------------------------------------');
  
  pricePoints.forEach(point => {
    const priceInEth = ethers.formatEther(point.price);
    const date = new Date(point.timestamp * 1000);
    console.log(`${point.timestamp} | ${priceInEth} | ${date.toLocaleTimeString()}`);
  });
  
  // Generate auction points for 1inch Fusion SDK
  console.log('\nGenerating auction points for 1inch Fusion SDK...');
  const auctionPoints = oracle.generateAuctionPoints(10);
  
  console.log('\nAuction Points:');
  auctionPoints.forEach(point => console.log(point));
  
  // Save the auction points to a file for later use
  const varsDir = path.join(__dirname, '..', 'vars');
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  
  const filePath = path.join(varsDir, 'auction-points.json');
  const jsonContent = JSON.stringify({
    'auction-points': auctionPoints
  }, null, 2);
  
  fs.writeFileSync(filePath, jsonContent);
  console.log(`\nAuction points saved to ${filePath}`);
  
  // Test the getCurrentPrice method
  console.log('\nCurrent price:', ethers.formatEther(oracle.getCurrentPrice()), 'ETH');
  
  console.log('\nMock Price Oracle setup complete!');
}

// Execute the main function if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error in setup-mock-price-oracle:', error);
      process.exit(1);
    });
}

export default main;
