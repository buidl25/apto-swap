import React from 'react';

interface SwapHistoryProps {
  history: Array<{ // Placeholder for swap history item structure
    id: string;
    fromAmount: string;
    fromToken: string;
    toAmount: string;
    toToken: string;
    status: 'completed' | 'pending' | 'failed';
    date: string;
  }>;
}

const SwapHistory: React.FC<SwapHistoryProps> = ({ history }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto mt-10 dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Swap History</h2>
      {
        history.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400">No swap history available.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((swap) => (
              <li key={swap.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {swap.fromAmount} {swap.fromToken} to {swap.toAmount} {swap.toToken}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date: {swap.date}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    swap.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                </span>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
};

export default SwapHistory;
