import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Server-side chain configuration from env
const chainId = parseInt(process.env.CHAIN_ID || '85300')
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545'

const serverChain = defineChain({
  id: chainId,
  name: process.env.CHAIN_NAME || 'CipherBFT',
  nativeCurrency: {
    decimals: 18,
    name: process.env.NATIVE_CURRENCY_NAME || 'CIPHER',
    symbol: process.env.NATIVE_CURRENCY_SYMBOL || 'CPH',
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
})

// Server-side clients (created once)
const privateKey = process.env.PRIVATE_KEY as `0x${string}`
const account = privateKeyToAccount(privateKey)

const publicClient = createPublicClient({
  chain: serverChain,
  transport: http(RPC_URL),
})

const walletClient = createWalletClient({
  account,
  chain: serverChain,
  transport: http(RPC_URL),
})

// Game contract ABI (server-side)
const GAME_CONTRACT_ABI = [
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
] as const

const GAME_CONTRACT_ADDRESS = (process.env.GAME_CONTRACT_ADDRESS || '0x057ef64E23666F000b34aE31332854aCBd1c8544') as `0x${string}`

// Nonce management for concurrent transactions
let currentNonce: number | null = null
let noncePromise: Promise<number> | null = null

async function getNextNonce(): Promise<number> {
  if (currentNonce === null) {
    if (!noncePromise) {
      noncePromise = publicClient.getTransactionCount({ address: account.address })
    }
    currentNonce = await noncePromise
    noncePromise = null
  }
  return currentNonce++
}

type TransactionRequest = {
  action: 'startGame' | 'recordMove' | 'endGame'
  params?: {
    direction?: number
    x?: string
    z?: string
    score?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TransactionRequest = await request.json()
    const { action, params } = body

    const nonce = await getNextNonce()
    let txHash: `0x${string}`

    switch (action) {
      case 'startGame':
        txHash = await walletClient.writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'startGame',
          nonce,
        })
        break

      case 'recordMove':
        if (!params || params.direction === undefined || !params.x || !params.z) {
          return NextResponse.json({ error: 'Missing params for recordMove' }, { status: 400 })
        }
        txHash = await walletClient.writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'recordMove',
          args: [params.direction, BigInt(params.x), BigInt(params.z)],
          nonce,
        })
        break

      case 'endGame':
        if (!params || !params.score) {
          return NextResponse.json({ error: 'Missing score for endGame' }, { status: 400 })
        }
        txHash = await walletClient.writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'endGame',
          args: [BigInt(params.score)],
          nonce,
        })
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      txHash,
      address: account.address,
    })
  } catch (error) {
    console.error('Transaction error:', error)
    // Reset nonce on error to refetch from chain
    currentNonce = null
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transaction failed' },
      { status: 500 }
    )
  }
}

// GET endpoint for connection status and account info
export async function GET() {
  try {
    const blockNumber = await publicClient.getBlockNumber()
    const balance = await publicClient.getBalance({ address: account.address })

    return NextResponse.json({
      connected: true,
      address: account.address,
      chainId,
      blockNumber: blockNumber.toString(),
      balance: balance.toString(),
      rpcUrl: RPC_URL.includes('localhost') ? 'localhost:8545' : 'remote',
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    })
  }
}
