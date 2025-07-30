import React from 'react';

interface CurrentSwapStatusProps {
  status: 'idle' | 'initiating' | 'pending_evm_htlc' | 'pending_aptos_htlc' | 'withdrawing_evm' | 'withdrawing_aptos' | 'completed' | 'failed';
  message: string;
  transactionHash?: string;
}

const CurrentSwapStatus: React.FC<CurrentSwapStatusProps> = ({
  status,
  message,
  transactionHash,
}) => {
  if (status === 'idle') return null;

  let statusColor = '';
  let statusText = '';

  switch (status) {
    case 'initiating':
    case 'pending_evm_htlc':
    case 'pending_aptos_htlc':
    case 'withdrawing_evm':
    case 'withdrawing_aptos':
      statusColor = 'bg-blue-500';
      statusText = 'Swap in Progress...';
      break;
    case 'completed':
      statusColor = 'bg-green-500';
      statusText = 'Swap Completed!';
      break;
    case 'failed':
      statusColor = 'bg-red-500';
      statusText = 'Swap Failed!';
      break;
    default:
      statusColor = 'bg-gray-500';
      statusText = 'Unknown Status';
  }

  return (
    <div className={`p-4 rounded-lg shadow-lg mt-8 text-white ${statusColor}`}>
      <h2 className="text-xl font-bold mb-2">{statusText}</h2>
      <p className="mb-2">{message}</p>
      {transactionHash && (
        <p className="text-sm break-all">
          Transaction Hash: <a href={`https://etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline">{transactionHash}</a>
        </p>
      )}
    </div>
  );
};

export default CurrentSwapStatus;
