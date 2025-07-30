import React from 'react';

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transactionDetails: {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    fee: string;
  };
}

const TransactionConfirmModal: React.FC<TransactionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transactionDetails,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Confirm Transaction</h2>
        <div className="mb-4">
          <p>From: {transactionDetails.fromAmount} {transactionDetails.fromToken}</p>
          <p>To: {transactionDetails.toAmount} {transactionDetails.toToken}</p>
          <p>Fee: {transactionDetails.fee}</p>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionConfirmModal;
