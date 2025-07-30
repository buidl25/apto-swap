import { create } from 'zustand';
import {
  connectMetaMask,
  getAccount,
  getEthBalance,
  setupMetaMaskEventListeners,
  removeMetaMaskEventListeners,
} from '../lib/wallets/metamask';
import {
  connectPetra,
  getPetraAccountAddress,
  getAptosCoinBalance,
  setupPetraEventListeners,
  removePetraEventListeners,
} from '../lib/wallets/petra';

interface WalletState {
  evmAccount: string | null;
  evmBalance: string | null;
  aptosAccount: string | null;
  aptosBalance: string | null;
  connectEvmWallet: () => Promise<void>;
  disconnectEvmWallet: () => void;
  connectAptosWallet: () => Promise<void>;
  disconnectAptosWallet: () => void;
  initializeWallets: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  evmAccount: null,
  evmBalance: null,
  aptosAccount: null,
  aptosBalance: null,

  initializeWallets: async () => {
    // Initialize MetaMask
    const currentEvmAccount = await getAccount();
    if (currentEvmAccount) {
      set({ evmAccount: currentEvmAccount });
      const balance = await getEthBalance(currentEvmAccount);
      set({ evmBalance: balance });
    }

    // Initialize Petra
    const currentAptosAccount = await getPetraAccountAddress();
    if (currentAptosAccount) {
      set({ aptosAccount: currentAptosAccount });
      const balance = await getAptosCoinBalance(currentAptosAccount);
      set({ aptosBalance: balance });
    }

    const handleEvmAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        set({ evmAccount: null, evmBalance: null });
      } else {
        set({ evmAccount: accounts[0] });
        getEthBalance(accounts[0]).then((balance) => set({ evmBalance: balance }));
      }
    };

    const handleEvmChainChanged = (chainId: string) => {
      console.log('MetaMask chain changed to:', chainId);
      // In a real app, you might want to re-fetch balances or update UI based on chain change
      // For now, just logging.
    };

    const handlePetraAccountChange = (account: { address: string }) => {
      if (account.address) {
        set({ aptosAccount: account.address });
        getAptosCoinBalance(account.address).then((balance) => set({ aptosBalance: balance }));
      } else {
        set({ aptosAccount: null, aptosBalance: null });
      }
    };

    setupMetaMaskEventListeners(handleEvmAccountsChanged, handleEvmChainChanged);
    setupPetraEventListeners(handlePetraAccountChange);
  },

  connectEvmWallet: async () => {
    try {
      const account = await connectMetaMask();
      if (account) {
        set({ evmAccount: account });
        const balance = await getEthBalance(account);
        set({ evmBalance: balance });
      }
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
    }
  },

  disconnectEvmWallet: () => {
    set({ evmAccount: null, evmBalance: null });
    // In a real application, you might want to clear MetaMask connection state if possible
    // For now, just clearing local state.
  },

  connectAptosWallet: async () => {
    try {
      const account = await connectPetra();
      if (account) {
        set({ aptosAccount: account });
        const balance = await getAptosCoinBalance(account);
        set({ aptosBalance: balance });
      }
    } catch (error) {
      console.error('Failed to connect Petra:', error);
    }
  },

  disconnectAptosWallet: () => {
    set({ aptosAccount: null, aptosBalance: null });
    // In a real application, you might want to clear Petra connection state if possible
    // For now, just clearing local state.
  },
}));

// Cleanup event listeners on unmount (e.g., when the app closes)
// This part is tricky with Zustand's `create` outside of a React component lifecycle.
// It's usually handled in the root component's useEffect or similar.
// For now, the listeners are set up in `initializeWallets` and assumed to persist.
// If the app has a clear unmount phase, `removeMetaMaskEventListeners` and `removePetraEventListeners`
// should be called there.
