import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'; // Replace with your backend API base URL

export const EvmService = {
  getAccountBalance: async (address: string, tokenAddress?: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/evm/balance/${address}`, {
        params: { tokenAddress },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching EVM balance:', error);
      throw error;
    }
  },

  getAvailableTokens: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/evm/tokens`);
      return response.data;
    } catch (error) {
      console.error('Error fetching EVM tokens:', error);
      throw error;
    }
  },

  // Add other EVM related API calls here
};
