
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const connectMetaMask = async (): Promise<string | null> => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const account = accounts[0];
      console.log('MetaMask connected:', account);
      return account;
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      return null;
    }
  } else {
    console.warn('MetaMask is not installed!');
    alert('Please install MetaMask to use this feature.');
    return null;
  }
};

export const getAccount = async (): Promise<string | null> => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        return accounts[0].address;
      }
      return null;
    } catch (error) {
      console.error('Error getting account:', error);
      return null;
    }
  }
  return null;
};

export const getEthBalance = async (address: string): Promise<string | null> => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      return null;
    }
  }
  return null;
};

export const getErc20Balance = async (tokenAddress: string, accountAddress: string): Promise<string | null> => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
      ];
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const balance = await tokenContract.balanceOf(accountAddress);
      const decimals = await tokenContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting ERC20 balance:', error);
      return null;
    }
  }
  return null;
};

export const setupMetaMaskEventListeners = (onAccountsChanged: (accounts: string[]) => void, onChainChanged: (chainId: string) => void) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);
  }
};

export const removeMetaMaskEventListeners = (onAccountsChanged: (accounts: string[]) => void, onChainChanged: (chainId: string) => void) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.removeListener('accountsChanged', onAccountsChanged);
    window.ethereum.removeListener('chainChanged', onChainChanged);
  }
};
