import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'; // Replace with your backend API base URL

export const SwapService = {
  initiateEvmToAptosSwap: async (swapDetails: any) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/swap-evm-to-aptos/initiate`, swapDetails);
      return response.data;
    } catch (error) {
      console.error('Error initiating EVM to Aptos swap:', error);
      throw error;
    }
  },

  initiateAptosToEvmSwap: async (swapDetails: any) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/swap-aptos-to-evm/initiate`, swapDetails);
      return response.data;
    } catch (error) {
      console.error('Error initiating Aptos to EVM swap:', error);
      throw error;
    }
  },

  getSwapStatus: async (swapId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/swap/status/${swapId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching swap status:', error);
      throw error;
    }
  },

  getSwapHistory: async (userAddress: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/swap/history/${userAddress}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching swap history:', error);
      throw error;
    }
  },

  // Add other swap related API calls here
};
