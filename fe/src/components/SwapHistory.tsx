import React from 'react';

interface SwapHistoryProps {
  swaps: Array<{ 
    id: string; 
    fromToken: string; 
    toToken: string; 
    fromAmount: string; 
    toAmount: string; 
    status: 'completed' | 'pending' | 'failed'; 
    date: string 
  }>;
}

const SwapHistory: React.FC<SwapHistoryProps> = ({ swaps }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-xl font-bold mb-4">Swap History</h2>
      {swaps.length === 0 ? (
        <p className="text-gray-500">No swap history available.</p>
      ) : (
        <ul>
          {swaps.map((swap) => (
            <li key={swap.id} className="border-b border-gray-200 py-2 last:border-b-0">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{swap.fromAmount} {swap.fromToken} to {swap.toAmount} {swap.toToken}</p>
                  <p className="text-sm text-gray-500">Status: {swap.status}</p>
                  <p className="text-xs text-gray-400">Date: {swap.date}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium
                    ${swap.status === 'completed' ? 'bg-green-100 text-green-800' :
                      swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                >
                  {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SwapHistory;
