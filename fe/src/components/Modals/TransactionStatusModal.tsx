import React from 'react';

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
  if (!isOpen) return null;

  let statusColor = '';
  let statusText = '';

  switch (status) {
    case 'pending':
      statusColor = 'bg-yellow-500';
      statusText = 'Pending...';
      break;
    case 'success':
      statusColor = 'bg-green-500';
      statusText = 'Success!';
      break;
    case 'failed':
      statusColor = 'bg-red-500';
      statusText = 'Failed!';
      break;
    default:
      statusColor = 'bg-gray-500';
      statusText = 'Unknown Status';
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center">
        <div className={`p-4 rounded-full ${statusColor} mx-auto w-16 h-16 flex items-center justify-center mb-4`}>
          {/* Icon based on status could go here */}
          <span className="text-white text-2xl">{status === 'pending' ? '⏳' : status === 'success' ? '✅' : '❌'}</span>
        </div>
        <h2 className="text-xl font-bold mb-2">{statusText}</h2>
        <p className="mb-4">{message}</p>
        {transactionHash && (
          <p className="text-sm text-gray-600 break-all">
            Transaction Hash: <a href={`https://etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{transactionHash}</a>
          </p>
        )}
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default TransactionStatusModal;
