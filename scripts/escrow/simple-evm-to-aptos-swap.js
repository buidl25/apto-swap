// Simplified EVM-to-Aptos swap script using BigInt serialization for escrow creation
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('\n=== Simplified EVM-to-Aptos Swap ===\n');
  
  try {
    console.log('STEP 1: Setting up accounts and parameters...');
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
    console.log(`EscrowFactory address: ${escrowFactoryAddress}`);
    
    // Create swap parameters
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example recipient
    
    // Get token address from environment or use factory address as fallback
    let tokenAddress = process.env.EVM_TOKEN_ADDRESS;
    if (!tokenAddress) {
      console.log('EVM_TOKEN_ADDRESS not found in environment, checking vars/evm-token-address.json');
      const tokenPath = path.join(__dirname, '../vars/evm-token-address.json');
      
      if (fs.existsSync(tokenPath)) {
        const tokenContent = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        tokenAddress = tokenContent['evm-token-address'];
      } else {
        console.log('Token address file not found, using factory address as token');
        tokenAddress = escrowFactoryAddress;
      }
    }
    console.log(`Using token address: ${tokenAddress}`);
    
    const amount = ethers.parseEther("0.1");
    const timelock = 1800; // 30 minutes
    const hashlock = ethers.ZeroHash;
    
    console.log('STEP 2: Creating order hash...');
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
    
    console.log('STEP 3: Loading EscrowFactory contract...');
    // Load the EscrowFactory contract
    const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
    const escrowFactory = await EscrowFactory.attach(escrowFactoryAddress);
    console.log('EscrowFactory contract loaded successfully');
    
    console.log('STEP 4: Converting addresses to BigInt...');
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
    
    console.log('STEP 5: Creating immutables struct with BigInt addresses...');
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
    
    console.log('STEP 6: Creating escrow contract...');
    // Use the deploy function with BigInt addresses
    console.log('Calling EscrowFactory.deploy with BigInt addresses...');
    const tx = await escrowFactory.deploy(bigIntImmutables, overrides);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    console.log('STEP 7: Retrieving escrow address using orderHash...');
    // Get the escrow address using the orderHash from the EscrowFactory contract
    let escrowAddress;
    
    try {
      // Use the getEscrowAddress function which maps orderHash to escrow address
      escrowAddress = await escrowFactory.getEscrowAddress(orderHash);
      console.log(`Retrieved escrow address: ${escrowAddress}`);
      
      // Verify the address is valid (not zero address)
      if (escrowAddress === '0x0000000000000000000000000000000000000000') {
        console.log('Warning: Retrieved zero address. Escrow may not have been created properly.');
        escrowAddress = null;
      }
    } catch (e) {
      console.log(`Failed to get escrow address: ${e.message}`);
    }
    
    // Fallback: Try to parse logs if available
    if (!escrowAddress && receipt.logs.length > 0) {
      console.log('Falling back to log parsing...');
      console.log(`Found ${receipt.logs.length} logs in the transaction receipt`);
      
      for (const log of receipt.logs) {
        try {
          const parsedLog = escrowFactory.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'EscrowDeployed') {
            console.log('Found EscrowDeployed event!');
            escrowAddress = parsedLog.args.escrow;
            console.log(`Retrieved escrow address from logs: ${escrowAddress}`);
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
        }
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
      
      console.log('STEP 8: Loading token contract...');
      // Load the token contract
      const Token = await ethers.getContractFactory('Token');
      const token = await Token.attach(tokenAddress);
      
      console.log('STEP 9: Approving token transfer...');
      // Approve the escrow contract to spend tokens
      const approveTx = await token.approve(escrowAddress, amount);
      console.log(`Approval transaction hash: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('Token approval confirmed');
      
      console.log('STEP 10: Funding the escrow...');
      // Load the escrow contract
      const Escrow = await ethers.getContractFactory('Escrow');
      const escrow = await Escrow.attach(escrowAddress);
      
      // Fund the escrow
      const fundTx = await escrow.fund({ gasLimit: 1000000 });
      console.log(`Fund transaction hash: ${fundTx.hash}`);
      await fundTx.wait();
      console.log('Escrow funded successfully');
      
      console.log('\nEVM-to-Aptos swap setup completed successfully!');
      console.log(`\nOrder Hash: ${orderHash}`);
      console.log(`Escrow Address: ${escrowAddress}`);
      console.log(`Amount: ${ethers.formatEther(amount)} ETH`);
      console.log(`Timelock: ${timelock} seconds`);
      console.log('\nNext steps:');
      console.log('1. Use the order hash to claim the funds on the Aptos side');
      console.log('2. If needed, the funds can be withdrawn using the simple-withdraw.js script');
    } else {
      console.log('Could not find escrow address in event logs');
    }
    
  } catch (error) {
    console.error('Error in EVM-to-Aptos swap:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
