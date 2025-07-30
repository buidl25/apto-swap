import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swap History | Cross-Chain Swap",
  description: "View your cross-chain swap history between EVM and Aptos blockchains",
};

/**
 * Swap history page component
 * @returns Swap history page React element
 */
export default function HistoryPage(): React.ReactElement {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Swap History</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          View your past cross-chain swaps between EVM chains and Aptos blockchain.
        </p>
        
        {/* History table will be implemented here */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Swap history table will be implemented here
          </p>
        </div>
      </div>
    </div>
  );
}
