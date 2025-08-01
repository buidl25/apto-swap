
import { Wallet } from '@aptos-labs/wallet-adapter-react';
import { AptosClient, CoinClient } from 'aptos';

declare global {
  interface Window {
    aptos?: Wallet;
  }
}

const NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com';
const aptosClient = new AptosClient(NODE_URL);
const coinClient = new CoinClient(aptosClient);

export const connectPetra = async (): Promise<string | null> => {
  if (typeof window.aptos !== 'undefined' && window?.aptos?.connect) {
    try {
      // In a real application, you would use the wallet adapter context here.
      // For demonstration, we'll simulate a connection.
      console.log('Connecting to Petra Wallet...');
      const account = await window?.aptos?.connect(); // This would be the actual call
      // const account = { address: '0x1234567890abcdef' }; // Placeholder for testing without Petra
      console.log('Petra Wallet connected:', account.address);
      return account.address;
    } catch (error) {
      console.error('Error connecting to Petra Wallet:', error);
      return null;
    }
  }
  return null;
};

export const getPetraAccountAddress = async (): Promise<string | null> => {
  if (typeof window.aptos !== 'undefined' && window?.aptos?.account) {
    try {
      const account = await window?.aptos?.account();
      return account.address as string;
    } catch (error) {
      console.error('Error getting Petra account address:', error);
      return null;
    }
  }
  return null;
};

export const getAptosCoinBalance = async (address: string): Promise<string | null> => {
  if (typeof window.aptos !== 'undefined') {
    try {
      const balance = await coinClient.checkBalance(address);
      return (balance / BigInt(10 ** 8)).toString(); // Aptos coin has 8 decimal places
    } catch (error) {
      console.error('Error getting Aptos coin balance:', error);
      return null;
    }
  }
  return null;
};

export const getAptosTokenBalance = async (tokenAddress: string, accountAddress: string): Promise<string | null> => {
  if (typeof window.aptos !== 'undefined') {
    try {
      // This would require more complex logic to get specific token balances
      // For now, return a placeholder
      console.log(`Fetching balance for token ${tokenAddress} for account ${accountAddress}`);
      return '100.0'; // Placeholder
    } catch (error) {
      console.error('Error getting Aptos token balance:', error);
      return null;
    }
  }
  return null;
};

export const setupPetraEventListeners = (onAccountChange: (account: { address: string }) => void) => {
  // if (typeof window.aptos !== 'undefined' && window?.aptos?.on) {
  //   window.aptos.on('accountChange', onAccountChange);
  // }
};

export const removePetraEventListeners = (onAccountChange: (account: { address: string }) => void) => {
  // if (typeof window.aptos !== 'undefined' && window?.aptos?.removeListener) {
  //   window.aptos.removeListener('accountChange', onAccountChange);
  // }
};
