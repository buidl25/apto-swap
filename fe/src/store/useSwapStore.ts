import { create } from 'zustand';

interface WalletState {
  evmAddress: string | null;
  aptosAddress: string | null;
  isConnected: boolean;
  connectEvm: (address: string) => void;
  connectAptos: (address: string) => void;
  disconnectEvm: () => void;
  disconnectAptos: () => void;
}

interface TokenBalance {
  [tokenSymbol: string]: string; // e.g., { ETH: '10.0', USDT: '500.0' }
}

interface BalancesState {
  evmBalances: TokenBalance;
  aptosBalances: TokenBalance;
  setEvmBalance: (token: string, balance: string) => void;
  setAptosBalance: (token: string, balance: string) => void;
  clearBalances: () => void;
}

interface CurrentSwapState {
  status: 'idle' | 'initiating' | 'pending_evm_htlc' | 'pending_aptos_htlc' | 'withdrawing_evm' | 'withdrawing_aptos' | 'completed' | 'failed';
  message: string;
  transactionHash?: string;
  setSwapStatus: (status: CurrentSwapState['status'], message: string, transactionHash?: string) => void;
  resetSwapStatus: () => void;
}

interface SwapHistoryEntry {
  id: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

interface SwapHistoryState {
  history: SwapHistoryEntry[];
  addSwapToHistory: (swap: SwapHistoryEntry) => void;
  updateSwapStatus: (id: string, status: SwapHistoryEntry['status']) => void;
}

interface SwapStore extends WalletState, BalancesState, CurrentSwapState, SwapHistoryState {}

export const useSwapStore = create<SwapStore>((set) => ({
  // Wallet State
  evmAddress: null,
  aptosAddress: null,
  isConnected: false,
  connectEvm: (address) => set({ evmAddress: address, isConnected: true }),
  connectAptos: (address) => set({ aptosAddress: address, isConnected: true }),
  disconnectEvm: () => set({ evmAddress: null, isConnected: false }),
  disconnectAptos: () => set({ aptosAddress: null, isConnected: false }),

  // Balances State
  evmBalances: {},
  aptosBalances: {},
  setEvmBalance: (token, balance) =>
    set((state) => ({
      evmBalances: { ...state.evmBalances, [token]: balance },
    })),
  setAptosBalance: (token, balance) =>
    set((state) => ({
      aptosBalances: { ...state.aptosBalances, [token]: balance },
    })),
  clearBalances: () => set({ evmBalances: {}, aptosBalances: {} }),

  // Current Swap State
  status: 'idle',
  message: '',
  transactionHash: undefined,
  setSwapStatus: (status, message, transactionHash) =>
    set({ status, message, transactionHash }),
  resetSwapStatus: () => set({ status: 'idle', message: '', transactionHash: undefined }),

  // Swap History State
  history: [],
  addSwapToHistory: (swap) =>
    set((state) => ({
      history: [...state.history, swap],
    })),
  updateSwapStatus: (id, status) =>
    set((state) => ({
      history: state.history.map((swap) =>
        swap.id === id ? { ...swap, status } : swap
      ),
    })),
}));
