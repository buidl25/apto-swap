import React from 'react';

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: string) => void;
}

const TokenSelectModal: React.FC<TokenSelectModalProps> = ({ isOpen, onClose, onSelectToken }) => {
  if (!isOpen) return null;

  const tokens = ['ETH', 'USDT', 'APT', 'USDC']; // Example tokens

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Select Token</h2>
        <ul>
          {tokens.map((token) => (
            <li
              key={token}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                onSelectToken(token);
                onClose();
              }}
            >
              {token}
            </li>
          ))}
        </ul>
        <button
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default TokenSelectModal;
