import Link from "next/link";
import { Footer } from "../components/layout/Footer";

/**
 * Home page component
 * @returns Home page React element
 */
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-center p-8">

        <div className="text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Seamless Cross-Chain Swaps</h2>
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            Swap tokens between EVM and Aptos blockchains securely using Hashed Timelock Contracts (HTLC) technology.
          </p>
          
          <div className="flex gap-6 justify-center flex-wrap">
            <Link 
              href="/swap/evm-to-aptos"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Swap EVM to Aptos
            </Link>
            <Link 
              href="/swap/aptos-to-evm"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Swap Aptos to EVM
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
