// Script to retrieve escrow address using order hash
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('\n=== Escrow Address Retrieval ===\n');
  
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
    
    // Load the transaction details to get the order hash
    let txDetailsPath = path.join(__dirname, '../vars/escrow-tx-details.json');
    console.log(`Looking for transaction details at: ${txDetailsPath}`);
    
    if (!fs.existsSync(txDetailsPath)) {
      console.error('Transaction details file not found. Please run direct-escrow-deploy first.');
      return;
    }
    
    const txDetails = JSON.parse(fs.readFileSync(txDetailsPath, 'utf8'));
    const orderHash = txDetails['order-hash'];
    console.log(`Using order hash: ${orderHash}`);
    
    // Load the EscrowFactory contract
    console.log('Loading EscrowFactory contract...');
    const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
    const escrowFactory = await EscrowFactory.attach(escrowFactoryAddress);
    console.log('EscrowFactory contract loaded');
    
    // Get the escrow address using the order hash
    console.log('Calling getEscrowAddress with order hash...');
    const escrowAddress = await escrowFactory.getEscrowAddress(orderHash);
    console.log(`Escrow address: ${escrowAddress}`);
    
    // Check if the address is valid (not zero address)
    if (escrowAddress === '0x0000000000000000000000000000000000000000') {
      console.log('Warning: Retrieved zero address. Escrow may not have been created properly.');
    } else {
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
        // Create a minimal interface to check if the contract exists
        const provider = ethers.provider;
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
    }
    
    console.log('\nEscrow address retrieval completed!');
    
  } catch (error) {
    console.error('Error retrieving escrow address:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
