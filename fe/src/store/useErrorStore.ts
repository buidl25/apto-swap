import { create } from 'zustand';

interface ErrorState {
  hasError: boolean;
  message: string;
  setError: (message: string) => void;
  clearError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  hasError: false,
  message: '',
  setError: (message) => set({ hasError: true, message }),
  clearError: () => set({ hasError: false, message: '' }),
}));
