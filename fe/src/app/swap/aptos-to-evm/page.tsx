import { Metadata } from "next";
import { SwapForm } from "@/components/swap";

export const metadata: Metadata = {
  title: "Aptos to EVM Swap | Cross-Chain Swap",
  description: "Swap tokens from Aptos blockchain to EVM chains using HTLC technology",
};

/**
 * Aptos to EVM swap page component
 * @returns Aptos to EVM swap page React element
 */
export default function AptosToEvmSwapPage(): React.ReactElement {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Aptos to EVM Swap</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Swap your tokens from Aptos blockchain to EVM chains (Ethereum, Polygon, etc.).
        </p>
        
        {/* Swap form will be implemented here */}
        <SwapForm />
      </div>
    </div>
  );
}
