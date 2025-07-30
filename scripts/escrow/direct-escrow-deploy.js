// Direct escrow deployment script with minimal approach
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('\n=== Direct Escrow Deployment ===\n');
  
  try {
    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`Using signer: ${signer.address}`);
    
    // Load the EscrowFactory address
    let escrowFactoryPath = path.join(__dirname, '../vars/escrow-factory-address.json');
    console.log(`Looking for EscrowFactory address at: ${escrowFactoryPath}`);
    
    if (!fs.existsSync(escrowFactoryPath)) {
      console.error('EscrowFactory address file not found. Please deploy the EscrowFactory first.');
      return;
    }
    
    const fileContent = JSON.parse(fs.readFileSync(escrowFactoryPath, 'utf8'));
    const escrowFactoryAddress = fileContent['escrow-factory-address'];
    console.log(`EscrowFactory address: ${escrowFactoryAddress}`);
    
    // Create test parameters for escrow creation
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example recipient
    
    // Get token address from environment or use factory address as fallback
    let tokenAddress = process.env.EVM_TOKEN_ADDRESS;
    if (!tokenAddress) {
      console.log('EVM_TOKEN_ADDRESS not found in environment, using factory address as token');
      tokenAddress = escrowFactoryAddress;
    }
    console.log(`Using token address: ${tokenAddress}`);
    
    const amount = ethers.parseEther("0.1");
    const timelock = 1800; // 30 minutes
    const hashlock = ethers.ZeroHash;
    
    // Create a unique order hash
    const orderHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256', 'uint256'],
        [signer.address, recipient, amount, Date.now()]
      )
    );
    console.log(`Generated order hash: ${orderHash}`);
    
    // Create timelocks array
    const timelocksArray = Array(8).fill(timelock);
    console.log('Timelocks array:', timelocksArray);
    
    // Load the EscrowFactory contract
    const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
    const escrowFactory = await EscrowFactory.attach(escrowFactoryAddress);
    console.log('EscrowFactory contract loaded');
    
    // Convert addresses to BigInt (this is the key to resolving the invalid address error)
    const makerBigInt = BigInt(signer.address);
    const takerBigInt = BigInt(recipient);
    const tokenBigInt = BigInt(tokenAddress);
    
    console.log('Address conversions:');
    console.log(`Original signer: ${signer.address}`);
    console.log(`BigInt signer: ${makerBigInt}`);
    console.log(`Original recipient: ${recipient}`);
    console.log(`BigInt recipient: ${takerBigInt}`);
    console.log(`Original token: ${tokenAddress}`);
    console.log(`BigInt token: ${tokenBigInt}`);
    
    // Create immutables with BigInt addresses
    const bigIntImmutables = {
      orderHash,
      maker: makerBigInt,
      taker: takerBigInt,
      token: tokenBigInt,
      amount,
      secretHash: hashlock,
      safetyDeposit: 0,
      timelocks: { values: timelocksArray }
    };
    
    console.log('BigInt immutables structure:');
    // Use a custom replacer function to handle BigInt serialization
    console.log(JSON.stringify(bigIntImmutables, (_, v) => 
      typeof v === 'bigint' ? v.toString() : v, 2));
    
    // Add transaction overrides
    const overrides = {
      gasLimit: 5000000,  // Increase gas limit
    };
    
    // Use the deploy function with BigInt addresses
    console.log('Calling EscrowFactory.deploy with BigInt addresses...');
    const tx = await escrowFactory.deploy(bigIntImmutables, overrides);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Save the transaction details for reference
    const txDetailsPath = path.join(__dirname, '../vars/escrow-tx-details.json');
    fs.writeFileSync(
      txDetailsPath,
      JSON.stringify({
        'tx-hash': tx.hash,
        'block-number': receipt.blockNumber,
        'order-hash': orderHash,
        'maker': signer.address,
        'taker': recipient,
        'token': tokenAddress,
        'amount': ethers.formatEther(amount)
      }, null, 2)
    );
    console.log(`Transaction details saved to: ${txDetailsPath}`);
    
    // Print the order hash for reference
    console.log('\nOrder Hash (needed for escrow operations):', orderHash);
    
    console.log('\nEscrow deployment completed successfully!');
    console.log('To find your escrow address, use the order hash with the EscrowFactory contract.');
    
  } catch (error) {
    console.error('Error in escrow deployment:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
