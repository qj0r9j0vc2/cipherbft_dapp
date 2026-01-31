import { http, createConfig } from 'wagmi'
import { createPublicClient, defineChain } from 'viem'

// Custom CipherBFT chain definition (client-side)
export const cipherBFT = defineChain({
  id: 85300,
  name: 'CipherBFT',
  nativeCurrency: {
    decimals: 18,
    name: 'CIPHER',
    symbol: 'CPH',
  },
  rpcUrls: {
    default: {
      http: ['/api/rpc'],
    },
  },
})

// Public client for reading (proxied through Next.js API)
export const publicClient = createPublicClient({
  chain: cipherBFT,
  transport: http('/api/rpc'),
})

// Wagmi config for React hooks
export const config = createConfig({
  chains: [cipherBFT],
  transports: {
    [cipherBFT.id]: http('/api/rpc'),
  },
})

// Contract configuration (public info only)
export const GAME_CONTRACT_ADDRESS = '0x057ef64E23666F000b34aE31332854aCBd1c8544' as const

export const GAME_CONTRACT_ABI = [
  {
    type: 'function',
    name: 'endGame',
    inputs: [{ name: 'score', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordMove',
    inputs: [
      { name: 'direction', type: 'uint8', internalType: 'uint8' },
      { name: 'x', type: 'uint256', internalType: 'uint256' },
      { name: 'z', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'startGame',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'GameOver',
    inputs: [
      { name: 'player', type: 'address', indexed: true, internalType: 'address' },
      { name: 'score', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'timestamp', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'GameStart',
    inputs: [
      { name: 'player', type: 'address', indexed: true, internalType: 'address' },
      { name: 'timestamp', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Move',
    inputs: [
      { name: 'player', type: 'address', indexed: true, internalType: 'address' },
      { name: 'direction', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'x', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'z', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'timestamp', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
