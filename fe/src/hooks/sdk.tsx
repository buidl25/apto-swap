import {
    HashLock,
    NetworkEnum,
    OrderStatus,
    PresetEnum,
    SDK,
    BlockchainProviderConnector,
    SupportedChain
} from '@1inch/cross-chain-sdk'
import { initializeConnector } from '@web3-react/core'
import { MetaMask } from '@web3-react/metamask'
import { ethers } from 'ethers'
import { useEffect, useState, useCallback } from 'react'

interface TypedDataDomain {
    name?: string
    version?: string
    chainId?: number
    verifyingContract?: string
    salt?: string
}

interface TypedDataType {
    name: string
    type: string
}

interface TypedDataTypes {
    [key: string]: TypedDataType[]
}

interface TypedDataMessage {
    [key: string]: string | number | boolean | Record<string, unknown>
}

interface TypedData {
    domain: TypedDataDomain
    types: TypedDataTypes
    message: TypedDataMessage
}

export interface EthereumProvider extends ethers.Eip1193Provider {
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

// declare global {
//     interface Window {
//         ethereum?: EthereumProvider;
//     }
// }

import { createSwapOrder } from './sdk-server';

export const use1inchSDK = () => {
    const [provider, setProvider] = useState<EthereumProvider | null>(null)
    const [account, setAccount] = useState<string | null>(null)

    // Initialize connector only on client side
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const [metaMask] = initializeConnector<MetaMask>(
            (actions) => new MetaMask({ actions })
        );

        const handleAccountsChanged = (accounts: unknown[]) => {
            setAccount(Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null);
        };

        // Connect to MetaMask and set up listeners
        const connect = async () => {
            try {
                await metaMask.activate();
                if (window.ethereum) {
                    setProvider(window?.ethereum as EthereumProvider);
                    // window.ethereum.on('accountsChanged', handleAccountsChanged);

                    // // Get initial account
                    // const accounts = await window.ethereum?.request({
                    //     method: 'eth_accounts'
                    // }) as string[];
                    // setAccount(accounts[0] || null);
                }
            } catch (error) {
                console.error('Failed to connect to MetaMask:', error);
            }
        };

        connect();

        return () => {
            // if (window.ethereum) {
            //     window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            // }
        };
    }, []);

    const [sdk, setSdk] = useState<SDK | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Initialize SDK when provider or account changes
    useEffect(() => {
        const initSDK = async () => {
            if (!provider || !account) {
                setSdk(null)
                return
            }

            try {
                setIsLoading(true)
                const web3Provider = new ethers.BrowserProvider(provider)
                const signer = await web3Provider.getSigner()

                const sdkInstance = new SDK({
                    url: 'https://api.1inch.dev/fusion-plus',
                    authKey: process.env.NEXT_ONE_INCH_API_KEY,
                    blockchainProvider: {
                        getWalletAddress: () => signer.getAddress(),
                        signTypedData: (walletAddress: string, typedData: TypedData) =>
                            signer.signTypedData(typedData.domain, typedData.types, typedData.message),
                        signTypedDataV4: (walletAddress: string, typedData: TypedData) =>
                            signer.signTypedData(typedData.domain, typedData.types, typedData.message),
                        ethCall: (contractAddress: string, callData: string) => provider.request({
                            method: 'eth_call',
                            params: [{ to: contractAddress, data: callData }, 'latest']
                        })
                    } as unknown as BlockchainProviderConnector
                })

                setSdk(sdkInstance)
                setError(null)
            } catch (err) {
                console.error('Failed to initialize SDK:', err)
                setError('Failed to initialize SDK')
                setSdk(null)
            } finally {
                setIsLoading(false)
            }
        }

        initSDK()
    }, [provider, account])

    // Generate random bytes compatible with browser
    const generateRandomBytes = useCallback((length: number) => {
        return ethers.hexlify(ethers.randomBytes(length))
    }, [])

    // Connect MetaMask
    const connectWallet = useCallback(() => {
        // metaMask.activate().catch(console.error)
    }, [])

    // Create order function
    const createOrder = useCallback(async (
        amount: string,
        srcChainId: NetworkEnum,
        dstChainId: NetworkEnum,
        srcTokenAddress: string,
        dstTokenAddress: string,
        preset: PresetEnum = PresetEnum.fast
    ) => {
        if (!account) {
            throw new Error('Account not connected');
        }

        try {
            setIsLoading(true);
            return await createSwapOrder({
                amount,
                srcChainId,
                dstChainId,
                srcTokenAddress,
                dstTokenAddress,
                walletAddress: account
            });
        } catch (error) {
            console.error('Swap failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [account]);

    return {
        sdk,
        isLoading,
        error,
        connectWallet,
        account,
        isConnected: !!account,
        createOrder,
        generateRandomBytes
    }
}