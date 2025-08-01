import { NextResponse } from 'next/server';
import { SDK } from '@1inch/cross-chain-sdk';

export async function POST(request: Request) {
  try {
    const params = await request.json();
    
    const sdk = new SDK({
      url: 'https://api.1inch.dev/fusion-plus',
      authKey: process.env.API_1INCH_KEY
    });
    
    const quote = await sdk.getQuote(params);
    
    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      { error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}
