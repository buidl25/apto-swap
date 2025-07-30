'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "../components/layout/Header";
import { useWalletStore } from "../store/useWalletStore";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata is not directly used in client components, but kept for consistency if this were a server component


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { evmAccount, evmBalance, aptosAccount, aptosBalance, connectEvmWallet, disconnectEvmWallet, connectAptosWallet, disconnectAptosWallet, initializeWallets } = useWalletStore();

  useEffect(() => {
    initializeWallets();
  }, [initializeWallets]);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
      >
        <Header
          evmAddress={evmAccount || undefined}
          evmBalance={evmBalance || undefined}
          aptosAddress={aptosAccount || undefined}
          aptosBalance={aptosBalance || undefined}
          onConnectEvmWallet={connectEvmWallet}
          onDisconnectEvmWallet={disconnectEvmWallet}
          onConnectAptosWallet={connectAptosWallet}
          onDisconnectAptosWallet={disconnectAptosWallet}
        />
        {children}
      </body>
    </html>
  );
}
