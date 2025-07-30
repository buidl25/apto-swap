# Hackathon Clone and Escrow Scripts

This directory contains scripts for deploying and interacting with the Hackathon Clone contracts on Aptos and the Escrow contracts on EVM.

## Setup and Prerequisites

1. Make sure you have the required dependencies installed:
   ```
   npm install
   ```

2. Set up your environment variables in a `.env` file:
   ```
   APTOS_MODULE_ADDRESS=<your_aptos_address>
   APTOS_RECIPIENT=<recipient_address>
   EVM_TOKEN_ADDRESS=<evm_token_address>
   EVM_RECIPIENT_ADDRESS=<evm_recipient_address>
   AMOUNT=<token_amount>
   TIMELOCK=<timelock_in_seconds>
   ```

3. Deploy the required contracts:
   ```
   npm run deploy-hackathon-clone
   npm run deploy-escrow-src
   ```

## Available Scripts

### Aptos Contracts

- **Deploy Hackathon Clone Contracts**:
  ```
  npm run deploy-hackathon-clone
  ```

- **Interact with EscrowDst Contract**:
  ```
  npm run interact-escrow-dst <command>
  ```
  Available commands: `create`, `withdraw`, `refund`, `check`, `help`

- **Interact with Aptos EscrowFactory Contract**:
  ```
  npm run interact-escrow-factory-aptos <command>
  ```
  Available commands: `create`, `list`, `help`

### EVM Contracts

- **Deploy EscrowSrc Contract**:
  ```
  npm run deploy-escrow-src
  ```

- **Interact with EVM EscrowFactory Contract**:
  ```
  npm run interact-escrow-factory-evm <command>
  ```
  Available commands: `deploy`, `create`, `list`, `help`

### Cross-Chain Swap Scripts

#### Aptos to EVM Swap

1. **Initiate Swap**:
   ```
   npm run swap-aptos-to-evm-escrow
   ```
   This will:
   - Create an escrow on Aptos using EscrowDst
   - Create an escrow on EVM using EscrowSrc
   - Generate a preimage and hashlock
   - Save swap details to `vars/aptos-evm-swap-details.json`

2. **Complete Swap**:
   ```
   npm run withdraw-aptos-evm-escrow
   ```
   Or with a specific preimage:
   ```
   PREIMAGE=<your_preimage> npm run withdraw-aptos-evm-escrow
   ```
   This will:
   - Withdraw from the EVM escrow using the preimage
   - Withdraw from the Aptos escrow using the same preimage

#### EVM to Aptos Swap

1. **Initiate Swap**:
   ```
   npm run swap-evm-to-aptos-escrow
   ```
   This will:
   - Create an escrow on EVM using EscrowSrc
   - Create an escrow on Aptos using EscrowDst
   - Generate a preimage and hashlock
   - Save swap details to `vars/evm-aptos-swap-details.json`

2. **Complete Swap**:
   ```
   npm run withdraw-evm-aptos-escrow
   ```
   Or with a specific preimage:
   ```
   PREIMAGE=<your_preimage> npm run withdraw-evm-aptos-escrow
   ```
   This will:
   - Withdraw from the Aptos escrow using the preimage
   - Withdraw from the EVM escrow using the same preimage

## Cross-Chain Swap Workflow

### Option 1: Original Scripts (May have hardhat config issues)

1. Run `swap-aptos-to-evm-escrow` to create escrows on both chains
2. Run `withdraw-aptos-evm-escrow` to complete the swap by withdrawing from both escrows

OR

1. Run `swap-evm-to-aptos-escrow` to create escrows on both chains
2. Run `withdraw-evm-aptos-escrow` to complete the swap by withdrawing from both escrows

### Option 2: Simplified Scripts (Recommended)

1. Run `simple-swap-setup` to generate preimage, hashlock, and other swap parameters
2. Create escrows on both chains using the commands provided by the script
3. Run `simple-withdraw` to get instructions for completing the swap by withdrawing from both escrows

## File Structure

### Original Scripts
- `deploy-hackathon-clone.js` - Deploy the Hackathon Clone contracts to Aptos
- `interact-escrow-dst.js` - Interact with the EscrowDst contract on Aptos
- `interact-escrow-factory.js` - Interact with the EscrowFactory contract on Aptos
- `swap-aptos-to-evm-escrow.js` - Create escrows on both chains for Aptos to EVM swap
- `withdraw-aptos-evm-escrow.js` - Complete Aptos to EVM swap by withdrawing from both escrows
- `swap-evm-to-aptos-escrow.js` - Create escrows on both chains for EVM to Aptos swap
- `withdraw-evm-aptos-escrow.js` - Complete EVM to Aptos swap by withdrawing from both escrows

### Simplified Scripts (Recommended)
- `simple-swap-setup.js` - Generate preimage, hashlock, and other swap parameters
- `simple-withdraw.js` - Get instructions for completing the swap by withdrawing from both escrows

## Notes

- All scripts save contract addresses and escrow details to JSON files in the `vars` directory
- The preimage and hashlock are automatically generated for each swap
- You can override any parameter using environment variables
