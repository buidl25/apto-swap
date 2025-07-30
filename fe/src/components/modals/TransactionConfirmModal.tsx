import React from 'react';
import Modal from './Modal';

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  swapDetails: {
    fromAmount: string;
    fromToken: string;
    toAmount: string;
    toToken: string;
    exchangeRate: string;
    fee: string;
  };
}

const TransactionConfirmModal: React.FC<TransactionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  swapDetails,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Swap">
      <div className="mt-2 text-gray-700 dark:text-gray-300">
        <p>You are about to swap:</p>
        <p className="font-semibold">{swapDetails.fromAmount} {swapDetails.fromToken}</p>
        <p>For:</p>
        <p className="font-semibold">{swapDetails.toAmount} {swapDetails.toToken}</p>
        <p className="mt-4">Exchange Rate: {swapDetails.exchangeRate}</p>
        <p>Transaction Fee: {swapDetails.fee}</p>
      </div>
      <div className="mt-4 flex justify-end space-x-3">
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
};

export default TransactionConfirmModal;
