// Comprehensive script to deploy an escrow and immediately extract its address
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('\n=== Escrow Deployment and Address Extraction ===\n');
  
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
    
    // Extract the escrow address from the logs
    console.log('\nExtracting escrow address from logs...');
    console.log(`Found ${receipt.logs.length} logs in the transaction receipt`);
    
    let escrowAddress = null;
    
    // Define the EscrowDeployed event signature
    const escrowDeployedTopic = ethers.id(
      "EscrowDeployed(address,bytes32,address,address,address,uint256,bytes32,uint256)"
    );
    
    console.log(`Looking for EscrowDeployed event with topic: ${escrowDeployedTopic}`);
    
    // Examine each log
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\nExamining log ${i + 1}/${receipt.logs.length}:`);
      console.log(`  Address: ${log.address}`);
      console.log(`  Topics: ${log.topics.length} topics`);
      
      // Print all topics for debugging
      for (let j = 0; j < log.topics.length; j++) {
        console.log(`  Topic ${j}: ${log.topics[j]}`);
      }
      
      // Print data
      console.log(`  Data: ${log.data}`);
      
      // Check if this is the EscrowDeployed event
      if (log.topics[0] === escrowDeployedTopic) {
        console.log('  Found EscrowDeployed event!');
        
        // The escrow address is the first indexed parameter (topic[1])
        escrowAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
        console.log(`  Extracted escrow address: ${escrowAddress}`);
        break;
      }
      
      // Try to parse the log with the EscrowFactory interface
      try {
        const parsedLog = escrowFactory.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (parsedLog) {
          console.log(`  Successfully parsed log: ${parsedLog.name}`);
          console.log(`  Event args: ${JSON.stringify(parsedLog.args)}`);
          
          if (parsedLog.name === 'EscrowDeployed') {
            console.log('  Found EscrowDeployed event!');
            escrowAddress = parsedLog.args.escrow;
            console.log(`  Extracted escrow address: ${escrowAddress}`);
            break;
          }
        }
      } catch (e) {
        console.log(`  Failed to parse log: ${e.message}`);
      }
    }
    
    // If we found the escrow address, save it
    if (escrowAddress) {
      console.log(`\nSuccessfully extracted escrow address: ${escrowAddress}`);
      
      // Save the escrow address
      const escrowAddressPath = path.join(__dirname, '../vars/escrow-address.json');
      fs.writeFileSync(
        escrowAddressPath,
        JSON.stringify({
          'escrow-address': escrowAddress,
          'order-hash': orderHash
        }, null, 2)
      );
      console.log(`Escrow address saved to: ${escrowAddressPath}`);
      
      // Try to verify the escrow contract
      console.log('\nVerifying escrow contract...');
      try {
        const code = await ethers.provider.getCode(escrowAddress);
        
        if (code === '0x') {
          console.log('Warning: No contract code found at the escrow address!');
        } else {
          console.log('Escrow contract verified! Contract code exists at the address.');
          console.log(`Code length: ${(code.length - 2) / 2} bytes`);
        }
      } catch (error) {
        console.log(`Failed to verify escrow contract: ${error.message}`);
      }
    } else {
      console.log('\nCould not extract escrow address from transaction logs.');
    }
    
    console.log('\nEscrow deployment and address extraction completed!');
    
  } catch (error) {
    console.error('Error in escrow deployment and address extraction:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
