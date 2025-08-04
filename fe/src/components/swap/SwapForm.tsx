"use client"
import React, { useState, FormEvent } from 'react';
import Image from 'next/image';
import { use1inchSDK } from '../../hooks/sdk';
import { NetworkEnum, PresetEnum } from '@1inch/cross-chain-sdk';

const SwapForm: React.FC = () => {
  const { createOrder, account, connectWallet } = use1inchSDK();
  const [fromAmount, setFromAmount] = useState('1');
  const [toAmount, setToAmount] = useState('3541.447909');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Swap');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!account) {
      connectWallet();
      return;
    }

    try {
      setIsLoading(true);
      await createOrder(
        fromAmount,
        NetworkEnum.POLYGON,
        NetworkEnum.BINANCE,
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // Placeholder
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Placeholder
        PresetEnum.fast
      );
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-2.5 rounded-3xl shadow-2xl max-w-sm mx-auto mt-10 font-sans border border-gray-200/70">
      <div className="flex justify-between items-center mb-5 px-2 pt-2">
        <div className="flex space-x-5">
          <button
            onClick={() => setActiveTab('Swap')}
            className={`text-base font-semibold ${activeTab === 'Swap' ? 'text-gray-800' : 'text-gray-400'}`}
          >
            Swap
          </button>
          <button
            onClick={() => setActiveTab('Limit')}
            className={`text-base font-semibold ${activeTab === 'Limit' ? 'text-gray-800' : 'text-gray-400'}`}
          >
            Limit
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m11 11v-5h-5M4.5 19.5l15-15" />
            </svg>
          </button>
          <button className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h2m4 0h10M4 12h7m4 0h5M4 18h9m4 0h3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-[#f7f8fa] p-4 rounded-2xl mb-1 relative">
        <p className="text-xs text-gray-500 mb-2">You pay</p>
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <Image src="/icons/eth.svg" alt="ETH" width={36} height={36} className="mr-3 rounded-full" />
            <div>
              <button className="font-bold text-lg flex items-center text-gray-800">
                ETH <span className="text-gray-400 font-light text-2xl mx-1">&rsaquo;</span>
              </button>
              <p className="text-xs text-gray-500">on Arbitrum</p>
            </div>
          </div>
          <div className="text-right">
            <input
              type="text"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="bg-transparent text-2xl font-mono w-full text-right outline-none text-gray-800"
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">~$3 551.93</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center my-[-12px] z-10 relative">
        <button className="bg-gray-200/70 rounded-full p-1 border-4 border-white shadow-sm hover:bg-gray-300">
          <Image src="/icons/arrow-down.svg" alt="Swap" width={16} height={16} />
        </button>
      </div>

      <div className="bg-[#f7f8fa] p-4 rounded-2xl mb-3">
        <p className="text-xs text-gray-500 mb-2">You receive</p>
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <Image src="/icons/usdt.svg" alt="USDT" width={36} height={36} className="mr-3 rounded-full" />
            <div>
              <button className="font-bold text-lg flex items-center text-gray-800">
                USDT <span className="text-gray-400 font-light text-2xl mx-1">&rsaquo;</span>
              </button>
              <p className="text-xs text-gray-500">on Base</p>
            </div>
          </div>
          <div className="text-right">
            <input
              type="text"
              value={toAmount}
              readOnly
              className="bg-transparent text-2xl font-mono w-full text-right outline-none text-gray-800"
              placeholder="3 541.447909"
            />
            <p className="text-xs text-gray-500 mt-1">~$3 534.28 (-0.5%)</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3 flex justify-between items-center px-2">
        <span>1 ETH = 3541.44 USDT ~$3 534.2</span>
        <button className="flex items-center font-medium text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Free
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-4 px-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-[#2E81F8] to-[#1A6DFF] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : account ? 'Confirm Swap' : 'Connect wallet'}
      </button>
    </div>
  );
};

export default SwapForm;
