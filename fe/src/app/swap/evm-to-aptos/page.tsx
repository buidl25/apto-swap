import { Metadata } from "next";
import { SwapForm } from "@/components/swap";

export const metadata: Metadata = {
  title: "EVM to Aptos Swap | Cross-Chain Swap",
  description: "Swap tokens from EVM chains to Aptos blockchain using HTLC technology",
};

/**
 * EVM to Aptos swap page component
 * @returns EVM to Aptos swap page React element
 */
export default function EvmToAptosSwapPage(): React.ReactElement {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">EVM to Aptos Swap</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Swap your tokens from EVM chains (Ethereum, Polygon, etc.) to Aptos blockchain.
        </p>
        
        {/* Swap form will be implemented here */}
        <SwapForm />
      </div>
    </div>
  );
}
