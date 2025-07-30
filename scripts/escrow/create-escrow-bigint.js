// Create escrow using BigInt approach (confirmed working in test)
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('\n=== Creating Escrow with BigInt Approach ===\n');
  
  try {
    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`Using signer: ${signer.address}`);
    
    // Load the EscrowFactory address
    let escrowFactoryPath = path.join(__dirname, '../vars/escrow-factory-address.json');
    console.log(`Looking for EscrowFactory address at: ${escrowFactoryPath}`);
    
    // If that path doesn't exist, try the alternative path
    if (!fs.existsSync(escrowFactoryPath)) {
      const altPath = path.join(__dirname, '../../vars/escrow-factory-address.json');
      console.log(`First path not found, trying alternative path: ${altPath}`);
      
      if (fs.existsSync(altPath)) {
        escrowFactoryPath = altPath;
      }
    }
    
    if (!fs.existsSync(escrowFactoryPath)) {
      console.error('EscrowFactory address file not found. Please deploy the EscrowFactory first.');
      return;
    }
    
    const fileContent = JSON.parse(fs.readFileSync(escrowFactoryPath, 'utf8'));
    const escrowFactoryAddress = fileContent['escrow-factory-address'];
    console.log('File content:', fileContent);
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
    console.log('Attempting contract call with BigInt addresses...');
    const tx = await escrowFactory.deploy(bigIntImmutables, overrides);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get the escrow address from the event logs
    let escrowAddress;
    for (const event of receipt.logs) {
      try {
        const parsedLog = escrowFactory.interface.parseLog(event);
        if (parsedLog && parsedLog.name === 'EscrowDeployed') {
          escrowAddress = parsedLog.args.escrow;
          break;
        }
      } catch (e) {
        // Skip logs that can't be parsed
      }
    }
    
    if (escrowAddress) {
      console.log(`Escrow deployed to: ${escrowAddress}`);
      
      // Save the escrow address to a file
      const escrowAddressPath = path.join(__dirname, '../vars/escrow-address.json');
      fs.writeFileSync(
        escrowAddressPath,
        JSON.stringify({ 'escrow-address': escrowAddress }, null, 2)
      );
      console.log(`Escrow address saved to: ${escrowAddressPath}`);
    } else {
      console.log('Could not find escrow address in event logs');
    }
    
    console.log('\nEscrow creation completed successfully!');
    
  } catch (error) {
    console.error('Error creating escrow:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
