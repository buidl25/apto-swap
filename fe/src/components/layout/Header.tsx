import Link from "next/link";
import { ReactElement } from "react";

/**
 * Props for the Header component
 */
export interface HeaderProps {
  /**
   * EVM wallet address if connected
   */
  readonly evmAddress?: string;
  /**
   * EVM wallet balance if connected
   */
  readonly evmBalance?: string;
  
  /**
   * Aptos wallet address if connected
   */
  readonly aptosAddress?: string;
  /**
   * Aptos wallet balance if connected
   */
  readonly aptosBalance?: string;
  
  /**
   * Function to connect EVM wallet
   */
  readonly onConnectEvmWallet?: () => void;
  
  /**
   * Function to connect Aptos wallet
   */
  readonly onConnectAptosWallet?: () => void;
  
  /**
   * Function to disconnect EVM wallet
   */
  readonly onDisconnectEvmWallet?: () => void;
  
  /**
   * Function to disconnect Aptos wallet
   */
  readonly onDisconnectAptosWallet?: () => void;
}

/**
 * Header component with wallet connection information
 * @param props - Component props
 * @returns Header component
 */
export function Header({
  evmAddress,
  evmBalance,
  aptosAddress,
  aptosBalance,
  onConnectEvmWallet,
  onConnectAptosWallet,
  onDisconnectEvmWallet,
  onDisconnectAptosWallet,
}: HeaderProps): ReactElement {
  /**
   * Truncates an address for display
   * @param address - Full address
   * @returns Truncated address
   */
  const truncateAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          Cross-Chain Swap
        </Link>
        
        <nav className="flex space-x-4">
          <Link 
            href="/swap/evm-to-aptos" 
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            EVM to Aptos
          </Link>
          <Link 
            href="/swap/aptos-to-evm" 
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Aptos to EVM
          </Link>
          <Link 
            href="/history" 
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            History
          </Link>
        </nav>
        
        <div className="flex space-x-3">
          {evmAddress ? (
            <div className="flex items-center">
              <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-md mr-2">
                EVM: {truncateAddress(evmAddress)} {evmBalance ? `(${parseFloat(evmBalance).toFixed(4)} ETH)` : ''}
              </span>
              <button 
                onClick={onDisconnectEvmWallet}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={onConnectEvmWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md"
            >
              Connect EVM
            </button>
          )}
          
          {aptosAddress ? (
            <div className="flex items-center">
              <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs px-2 py-1 rounded-md mr-2">
                Aptos: {truncateAddress(aptosAddress)} {aptosBalance ? `(${parseFloat(aptosBalance).toFixed(4)} APT)` : ''}
              </span>
              <button 
                onClick={onDisconnectAptosWallet}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={onConnectAptosWallet}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded-md"
            >
              Connect Aptos
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
