import React from 'react';
import Modal from './Modal';

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'pending' | 'success' | 'failed';
  message: string;
  transactionHash?: string;
}

const TransactionStatusModal: React.FC<TransactionStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  message,
  transactionHash,
}) => {
  const getTitle = () => {
    switch (status) {
      case 'pending':
        return 'Transaction Pending';
      case 'success':
        return 'Transaction Successful!';
      case 'failed':
        return 'Transaction Failed';
      default:
        return 'Transaction Status';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'pending':
        return <span className="text-yellow-500 text-4xl">⏳</span>;
      case 'success':
        return <span className="text-green-500 text-4xl">✅</span>;
      case 'failed':
        return <span className="text-red-500 text-4xl">❌</span>;
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <div className="mt-2 text-center">
        <div className="mb-4 flex justify-center">
          {getIcon()}
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{message}</p>
        {transactionHash && (
          <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
            Hash: <a href={`#`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{transactionHash}</a>
          </p>
        )}
      </div>
    </Modal>
  );
};

export default TransactionStatusModal;
