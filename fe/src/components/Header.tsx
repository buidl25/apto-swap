
import React, { useState, useEffect } from 'react';
import { connectMetaMask, getAccount, getEthBalance, setupMetaMaskEventListeners, removeMetaMaskEventListeners } from '../lib/wallets/metamask';
import { connectPetra, getPetraAccountAddress, getAptosCoinBalance, setupPetraEventListeners, removePetraEventListeners } from '../lib/wallets/petra';

const Header: React.FC = () => {
  const [evmAccount, setEvmAccount] = useState<string | null>(null);
  const [evmBalance, setEvmBalance] = useState<string | null>(null);
  const [aptosAccount, setAptosAccount] = useState<string | null>(null);
  const [aptosBalance, setAptosBalance] = useState<string | null>(null);

  useEffect(() => {
    const initWallets = async () => {
      // Initialize MetaMask
      const currentEvmAccount = await getAccount();
      if (currentEvmAccount) {
        setEvmAccount(currentEvmAccount);
        const balance = await getEthBalance(currentEvmAccount);
        setEvmBalance(balance);
      }

      // Initialize Petra
      const currentAptosAccount = await getPetraAccountAddress();
      if (currentAptosAccount) {
        setAptosAccount(currentAptosAccount);
        const balance = await getAptosCoinBalance(currentAptosAccount);
        setAptosBalance(balance);
      }
    };

    initWallets();

    const handleEvmAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setEvmAccount(null);
        setEvmBalance(null);
      } else {
        setEvmAccount(accounts[0]);
        getEthBalance(accounts[0]).then(setEvmBalance);
      }
    };

    const handleEvmChainChanged = (chainId: string) => {
      console.log('MetaMask chain changed to:', chainId);
      // You might want to re-fetch balances or update UI based on chain change
    };

    const handlePetraAccountChange = (account: { address: string }) => {
      if (account.address) {
        setAptosAccount(account.address);
        getAptosCoinBalance(account.address).then(setAptosBalance);
      } else {
        setAptosAccount(null);
        setAptosBalance(null);
      }
    };

    setupMetaMaskEventListeners(handleEvmAccountsChanged, handleEvmChainChanged);
    setupPetraEventListeners(handlePetraAccountChange);

    return () => {
      removeMetaMaskEventListeners(handleEvmAccountsChanged, handleEvmChainChanged);
      removePetraEventListeners(handlePetraAccountChange);
    };
  }, []);

  const handleConnectMetaMask = async () => {
    const account = await connectMetaMask();
    if (account) {
      setEvmAccount(account);
      const balance = await getEthBalance(account);
      setEvmBalance(balance);
    }
  };

  const handleConnectPetra = async () => {
    const account = await connectPetra();
    if (account) {
      setAptosAccount(account);
      const balance = await getAptosCoinBalance(account);
      setAptosBalance(balance);
    }
  };

  return (
    <header style={{ padding: '20px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1>Cross-Chain Swap</h1>
      <div>
        <div style={{ marginBottom: '10px' }}>
          <h3>MetaMask (EVM)</h3>
          {evmAccount ? (
            <>
              <p>Address: {evmAccount.substring(0, 6)}...{evmAccount.substring(evmAccount.length - 4)}</p>
              <p>Balance: {evmBalance} ETH</p>
            </>
          ) : (
            <button onClick={handleConnectMetaMask}>Connect MetaMask</button>
          )}
        </div>
        <div>
          <h3>Petra Wallet (Aptos)</h3>
          {aptosAccount ? (
            <>
              <p>Address: {aptosAccount.substring(0, 6)}...{aptosAccount.substring(aptosAccount.length - 4)}</p>
              <p>Balance: {aptosBalance} APT</p>
            </>
          ) : (
            <button onClick={handleConnectPetra}>Connect Petra</button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
