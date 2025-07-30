import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swap | Cross-Chain Swap",
  description: "Swap tokens between EVM and Aptos blockchains using HTLC technology",
};

/**
 * Swap layout component
 * @param props - Component props
 * @param props.children - Child components
 * @returns Swap layout React element
 */
export default function SwapLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
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
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 shadow-inner py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Cross-Chain Swap | Powered by HTLC Technology
          </p>
        </div>
      </footer>
    </div>
  );
}
