// Script to retrieve transaction receipt and extract escrow address from logs
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('\n=== Transaction Receipt Analysis ===\n');
  
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
    
    // Load the transaction details to get the transaction hash
    let txDetailsPath = path.join(__dirname, '../vars/escrow-tx-details.json');
    console.log(`Looking for transaction details at: ${txDetailsPath}`);
    
    if (!fs.existsSync(txDetailsPath)) {
      console.error('Transaction details file not found. Please run direct-escrow-deploy first.');
      return;
    }
    
    const txDetails = JSON.parse(fs.readFileSync(txDetailsPath, 'utf8'));
    const txHash = txDetails['tx-hash'];
    const orderHash = txDetails['order-hash'];
    console.log(`Using transaction hash: ${txHash}`);
    console.log(`Order hash: ${orderHash}`);
    
    // Load the EscrowFactory contract
    console.log('Loading EscrowFactory contract...');
    const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
    const escrowFactory = await EscrowFactory.attach(escrowFactoryAddress);
    console.log('EscrowFactory contract loaded');
    
    // Get the transaction receipt
    console.log('Retrieving transaction receipt...');
    const provider = ethers.provider;
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.error('Transaction receipt not found!');
      return;
    }
    
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Status: ${receipt.status ? 'Success' : 'Failed'}`);
    console.log(`Found ${receipt.logs.length} logs in the transaction receipt`);
    
    // Extract the escrow address from the logs
    let escrowAddress = null;
    
    // Define the EscrowDeployed event signature
    const escrowDeployedTopic = ethers.id(
      "EscrowDeployed(address,bytes32,address,address,address,uint256,bytes32,uint256)"
    );
    
    console.log(`\nLooking for EscrowDeployed event with topic: ${escrowDeployedTopic}`);
    
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
        const code = await provider.getCode(escrowAddress);
        
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
    
    console.log('\nTransaction receipt analysis completed!');
    
  } catch (error) {
    console.error('Error analyzing transaction receipt:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
