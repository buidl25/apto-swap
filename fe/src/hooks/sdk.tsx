import { useCallback, useEffect, useState } from 'react';
import { SDK, BlockchainProviderConnector } from '@1inch/cross-chain-sdk';
import { initializeConnector } from '@web3-react/core';
import { MetaMask } from '@web3-react/metamask';
import { Web3Provider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { createSwapOrder } from './sdk-server';

interface TypedDataDomain {
    name?: string
    version?: string
    chainId?: number
    verifyingContract?: string
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

interface EIP712TypedData {
    domain: TypedDataDomain;
    types: Record<string, Array<TypedDataField>>;
    message: Record<string, any>;
}

interface TypedDataField {
    name: string;
    type: string;
}

interface EthereumProvider {
    on: (event: string, callback: (accounts: string[]) => void) => void;
    removeListener: (event: string, callback: (accounts: string[]) => void) => void;
    send: (method: string, params: unknown[]) => Promise<unknown>;
}

// declare global {
//     interface Window {
//         ethereum?: EthereumProvider;
//     }
// }

export const use1inchSDK = () => {
    const [provider, setProvider] = useState<Web3Provider | null>(null);
    const [account, setAccount] = useState<string | null>(null);

    const handleAccountsChanged = useCallback((accounts: unknown[]) => {
        setAccount(accounts?.[0] as string || null);
    }, []);

    const connectWallet = useCallback(async () => {
        try {
            const [metaMask] = initializeConnector<MetaMask>(
                (actions) => new MetaMask({ actions })
            );
            await metaMask.activate();
            if (window.ethereum) {
                const provider = new Web3Provider(window.ethereum);
                setProvider(provider);
                (window.ethereum as EthereumProvider).on('accountsChanged', handleAccountsChanged);
                const accounts = await (window.ethereum as EthereumProvider).send('eth_accounts', [] as unknown[]);
                handleAccountsChanged(accounts as string[]);
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        }
    }, [handleAccountsChanged]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        connectWallet();

        return () => {
            if (window.ethereum) {
                (window.ethereum as EthereumProvider).removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, [connectWallet, handleAccountsChanged]);

    const [sdk, setSdk] = useState<SDK | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const initSDK = async () => {
            if (!provider || !account) {
                setSdk(null)
                return
            }

            try {
                setIsLoading(true)
                const signer = provider.getSigner();
                const typedSigner: BlockchainProviderConnector = {
                    signTypedData: async (walletAddress: string, typedData: EIP712TypedData) => {
                        return signer._signTypedData(
                            typedData.domain as TypedDataDomain,
                            typedData.types as Record<string, Array<TypedDataField>>,
                            typedData.message as Record<string, any>
                        );
                    },
                    ethCall: async (contractAddress: string, callData: string): Promise<string> =>
                        (await (window.ethereum as EthereumProvider).send('eth_call', [
                            { to: contractAddress, data: callData },
                            'latest'
                        ] as unknown[])) as string
                };

                const sdkInstance = new SDK({
                    url: 'https://api.1inch.dev/fusion-plus',
                    blockchainProvider: typedSigner
                });

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

    const generateRandomBytes = useCallback((length: number) => {
        return ethers.hexlify(ethers.randomBytes(length))
    }, [])

    const createOrder = useCallback(async (
        amount: string,
        srcChainId: number,
        dstChainId: number,
        srcTokenAddress: string,
        dstTokenAddress: string,
        preset: string = 'fast'
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