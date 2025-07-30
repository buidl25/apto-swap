import React from 'react';

interface CurrentSwapStatusProps {
  status: 'idle' | 'approving' | 'htlc-creating-evm' | 'htlc-monitoring-evm' | 'htlc-creating-aptos' | 'htlc-withdrawing-aptos' | 'completed' | 'failed';
  message: string;
  transactionHash?: string;
}

const CurrentSwapStatus: React.FC<CurrentSwapStatusProps> = ({ status, message, transactionHash }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'idle':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto mt-10 dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">Current Swap Status</h2>
      <div className={`p-4 rounded-md ${getStatusColor()}`}>
        <p className="font-semibold mb-2">Status: {status.replace(/-/g, ' ').toUpperCase()}</p>
        <p className="text-sm">{message}</p>
        {transactionHash && (
          <p className="text-xs mt-2 break-all">
            Tx Hash: <a href={`#`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{transactionHash}</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default CurrentSwapStatus;
