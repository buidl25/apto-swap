// Debug script to investigate escrow creation and address retrieval
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('\n=== Debug Escrow Creation and Address Retrieval ===\n');
  
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
    console.log('\nLoading EscrowFactory contract...');
    const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
    const escrowFactory = await EscrowFactory.attach(escrowFactoryAddress);
    console.log('EscrowFactory contract loaded');
    
    // Debug: Print contract interface
    console.log('\nContract interface functions:');
    for (const fragment of escrowFactory.interface.fragments) {
      if (fragment.type === 'function') {
        console.log(`  ${fragment.format()}`);
      }
    }
    
    console.log('\nContract interface events:');
    for (const fragment of escrowFactory.interface.fragments) {
      if (fragment.type === 'event') {
        console.log(`  ${fragment.format()}`);
      }
    }
    
    // Convert addresses to BigInt (this is the key to resolving the invalid address error)
    const makerBigInt = BigInt(signer.address);
    const takerBigInt = BigInt(recipient);
    const tokenBigInt = BigInt(tokenAddress);
    
    console.log('\nAddress conversions:');
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
    
    console.log('\nBigInt immutables structure:');
    // Use a custom replacer function to handle BigInt serialization
    console.log(JSON.stringify(bigIntImmutables, (_, v) => 
      typeof v === 'bigint' ? v.toString() : v, 2));
    
    // Add transaction overrides
    const overrides = {
      gasLimit: 5000000,  // Increase gas limit
    };
    
    // Use the deploy function with BigInt addresses
    console.log('\nCalling EscrowFactory.deploy with BigInt addresses...');
    const tx = await escrowFactory.deploy(bigIntImmutables, overrides);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Status: ${receipt.status ? 'Success' : 'Failed'}`);
    
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
    
    // Debug: Examine the transaction receipt in detail
    console.log('\nExamining transaction receipt in detail:');
    console.log('Receipt object keys:', Object.keys(receipt));
    console.log(`Receipt logs count: ${receipt.logs.length}`);
    
    // Examine each log
    if (receipt.logs.length > 0) {
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`\nLog ${i + 1}/${receipt.logs.length}:`);
        console.log(`  Address: ${log.address}`);
        console.log(`  Topics count: ${log.topics.length}`);
        
        // Print all topics for debugging
        for (let j = 0; j < log.topics.length; j++) {
          console.log(`  Topic ${j}: ${log.topics[j]}`);
        }
        
        // Print data
        console.log(`  Data: ${log.data}`);
      }
    } else {
      console.log('No logs found in the transaction receipt!');
      console.log('This is unusual for a contract deployment transaction.');
    }
    
    // Try to directly call the getEscrowAddress function
    console.log('\nAttempting to call getEscrowAddress with the order hash...');
    try {
      // Use a lower-level call to avoid ABI issues
      const callData = escrowFactory.interface.encodeFunctionData('getEscrowAddress', [orderHash]);
      const result = await signer.provider.call({
        to: escrowFactoryAddress,
        data: callData
      });
      
      console.log('Raw result:', result);
      
      if (result && result !== '0x') {
        // Try to decode the result
        try {
          const decodedResult = escrowFactory.interface.decodeFunctionResult('getEscrowAddress', result);
          console.log('Decoded result:', decodedResult);
          
          const escrowAddress = decodedResult[0];
          console.log(`Escrow address: ${escrowAddress}`);
          
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
        } catch (e) {
          console.log(`Failed to decode result: ${e.message}`);
        }
      } else {
        console.log('Empty or invalid result returned from getEscrowAddress call');
      }
    } catch (e) {
      console.log(`Error calling getEscrowAddress: ${e.message}`);
    }
    
    // Debug: Try to get the implementation address
    console.log('\nAttempting to get the implementation address...');
    try {
      const implementation = await escrowFactory.implementation();
      console.log(`Implementation address: ${implementation}`);
    } catch (e) {
      console.log(`Error getting implementation address: ${e.message}`);
    }
    
    console.log('\nDebug completed!');
    
  } catch (error) {
    console.error('Error in debug script:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
