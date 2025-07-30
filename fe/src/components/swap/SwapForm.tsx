import React from 'react';

const SwapForm: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">Swap Tokens</h2>

      {/* From Token Selection */}
      <div className="mb-4">
        <label htmlFor="fromToken" className="block text-sm font-medium text-gray-700">From</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="number"
            name="fromAmount"
            id="fromAmount"
            className="block w-full pr-12 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="0.0"
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              type="button"
              className="h-full rounded-md border-transparent bg-gray-100 py-0 pl-2 pr-7 text-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              Select Token
            </button>
          </div>
        </div>
      </div>

      {/* Swap Button (Visual only) */}
      <div className="flex justify-center my-4">
        <button className="p-2 rounded-full bg-blue-500 text-white">
          ↓
        </button>
      </div>

      {/* To Token Selection */}
      <div className="mb-6">
        <label htmlFor="toToken" className="block text-sm font-medium text-gray-700">To</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name="toAmount"
            id="toAmount"
            className="block w-full pr-12 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
            placeholder="0.0"
            readOnly
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              type="button"
              className="h-full rounded-md border-transparent bg-gray-100 py-0 pl-2 pr-7 text-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              Select Token
            </button>
          </div>
        </div>
      </div>

      {/* Exchange Rate & Fee */}
      <div className="text-sm text-gray-600 mb-4">
        <p>Exchange Rate: 1 ETH = 1234.56 APT (placeholder)</p>
        <p>Transaction Fee: 0.001 ETH (placeholder)</p>
      </div>

      {/* Confirm Swap Button */}
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Confirm Swap
      </button>
    </div>
  );
};

export default SwapForm;