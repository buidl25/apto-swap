import React from 'react';
import Modal from './Modal';

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: string) => void;
}

const TokenSelectModal: React.FC<TokenSelectModalProps> = ({ isOpen, onClose, onSelectToken }) => {
  const tokens = ["ETH", "WETH", "USDC", "DAI", "APT"]; // Placeholder tokens

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Token">
      <div className="mt-2">
        <input
          type="text"
          placeholder="Search token..."
          className="w-full p-2 border border-gray-300 rounded-md mb-4 dark:bg-gray-700 dark:text-white"
        />
        <ul className="max-h-60 overflow-y-auto">
          {tokens.map((token) => (
            <li
              key={token}
              className="p-3 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700 rounded-md"
              onClick={() => {
                onSelectToken(token);
                onClose();
              }}
            >
              {token}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default TokenSelectModal;