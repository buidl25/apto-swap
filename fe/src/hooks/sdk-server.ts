'use server'

import {
    HashLock,
    NetworkEnum,
    PresetEnum,
    SDK,
    SupportedChain
} from '@1inch/cross-chain-sdk'

export async function createSwapOrder(params: {
    amount: string
    srcChainId: NetworkEnum
    dstChainId: NetworkEnum
    srcTokenAddress: string
    dstTokenAddress: string
    walletAddress: string
}) {
    try {
        const sdk = new SDK({
            url: 'https://api.1inch.dev/fusion-plus',
            authKey: process.env.NEXT_ONE_INCH_API_KEY
        })

        // Get quote
        const quote = await sdk.getQuote({
            amount: params.amount,
            srcChainId: params.srcChainId as SupportedChain,
            dstChainId: params.dstChainId as SupportedChain,
            enableEstimate: true,
            srcTokenAddress: params.srcTokenAddress,
            dstTokenAddress: params.dstTokenAddress,
            walletAddress: params.walletAddress,
            source: 'swap-app'
        })

        const preset = PresetEnum.fast
        debugger
        // Generate secrets
        const secrets = Array.from({ length: quote.presets[preset]?.secretsCount ?? 1 })
            .map(() => {
                const bytes = new Uint8Array(32);
                crypto.getRandomValues(bytes);
                return Array.from(bytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            });

        const hashLock = secrets.length === 1
            ? HashLock.forSingleFill(secrets[0])
            : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets))

        const secretHashes = secrets.map(s => {
            if (s.length !== 64) {
                throw new Error('Secret must be 32 bytes hex encoded');
            }
            return HashLock.hashSecret(s);
        });

        // Create and submit order
        const { hash, quoteId, order } = await sdk.createOrder(quote, {
            walletAddress: params.walletAddress,
            hashLock,
            preset,
            source: 'swap-app',
            secretHashes
        })

        await sdk.submitOrder(
            quote.srcChainId,
            order,
            quoteId,
            secretHashes
        )

        return { hash, order }
    } catch (error) {
        console.error(error);
        throw error;
    }
}
