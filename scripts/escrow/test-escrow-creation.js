// Test script for escrow creation
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n=== Testing Escrow Creation ===\n');
  
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
    
    // Load the EscrowFactory contract
    const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
    const escrowFactory = await EscrowFactory.attach(escrowFactoryAddress);
    console.log('EscrowFactory contract loaded');
    
    // Skip getting the implementation address as it's causing issues
    console.log('Skipping implementation address check and proceeding with escrow creation test...');
    
    // Create test parameters for escrow creation
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example recipient
    const tokenAddress = escrowFactoryAddress; // Using factory address as token for testing
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
    
    // Create the immutables struct directly using the contract's expected format
    console.log('Creating immutables struct...');
    
    // Try different formats for the immutables struct
    
    // Format 1: Using primitive types
    console.log('\nTrying Format 1: Using primitive types');
    try {
      const immutables1 = {
        orderHash,
        maker: signer.address,
        taker: recipient,
        token: tokenAddress,
        amount,
        secretHash: hashlock,
        safetyDeposit: 0,
        timelocks: timelocksArray
      };
      
      console.log('Immutables Format 1:', JSON.stringify(immutables1, null, 2));
      console.log('Calling deploy with Format 1...');
      
      const tx1 = await escrowFactory.deploy(immutables1, { gasLimit: 5000000 });
      console.log(`Transaction hash: ${tx1.hash}`);
      const receipt1 = await tx1.wait();
      console.log(`Transaction confirmed in block ${receipt1.blockNumber}`);
      console.log('Format 1 succeeded!');
    } catch (error) {
      console.error('Format 1 failed:', error.message);
    }
    
    // Format 2: Using Address objects with addr field
    console.log('\nTrying Format 2: Using Address objects with addr field');
    try {
      const immutables2 = {
        orderHash,
        maker: { addr: signer.address },
        taker: { addr: recipient },
        token: { addr: tokenAddress },
        amount,
        secretHash: hashlock,
        safetyDeposit: 0,
        timelocks: { values: timelocksArray }
      };
      
      console.log('Immutables Format 2:', JSON.stringify(immutables2, null, 2));
      console.log('Calling deploy with Format 2...');
      
      const tx2 = await escrowFactory.deploy(immutables2, { gasLimit: 5000000 });
      console.log(`Transaction hash: ${tx2.hash}`);
      const receipt2 = await tx2.wait();
      console.log(`Transaction confirmed in block ${receipt2.blockNumber}`);
      console.log('Format 2 succeeded!');
    } catch (error) {
      console.error('Format 2 failed:', error.message);
    }
    
    // Format 3: Using BigInt for addresses
    console.log('\nTrying Format 3: Using BigInt for addresses');
    try {
      const makerBigInt = BigInt(signer.address);
      const takerBigInt = BigInt(recipient);
      const tokenBigInt = BigInt(tokenAddress);
      
      const immutables3 = {
        orderHash,
        maker: makerBigInt,
        taker: takerBigInt,
        token: tokenBigInt,
        amount,
        secretHash: hashlock,
        safetyDeposit: 0,
        timelocks: { values: timelocksArray }
      };
      
      console.log('Immutables Format 3:', JSON.stringify(immutables3, (_, v) => 
        typeof v === 'bigint' ? v.toString() : v, 2));
      console.log('Calling deploy with Format 3...');
      
      const tx3 = await escrowFactory.deploy(immutables3, { gasLimit: 5000000 });
      console.log(`Transaction hash: ${tx3.hash}`);
      const receipt3 = await tx3.wait();
      console.log(`Transaction confirmed in block ${receipt3.blockNumber}`);
      console.log('Format 3 succeeded!');
    } catch (error) {
      console.error('Format 3 failed:', error.message);
    }
    
    console.log('\nTest completed.');
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
