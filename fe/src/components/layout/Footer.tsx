import { ReactElement } from "react";

/**
 * Footer component props
 */
export interface FooterProps {
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Footer component with useful links
 * @param props - Component props
 * @returns Footer component
 */
export function Footer({ className = "" }: FooterProps): ReactElement {
  return (
    <footer className={`bg-white dark:bg-gray-800 shadow-inner py-6 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex space-x-6 mb-4 md:mb-0">
            <a 
              href="#" 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
            >
              Documentation
            </a>
            <a 
              href="#" 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
            >
              API Reference
            </a>
            <a 
              href="#" 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
            >
              Support
            </a>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Cross-Chain Swap | Powered by HTLC Technology
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
