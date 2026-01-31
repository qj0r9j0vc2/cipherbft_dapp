'use client'

import { useCallback, useEffect, useState } from 'react'
import { keccak256, toHex } from 'viem'
import { useGameStore } from '@/store/gameStore'

interface TxMetrics {
  pendingCount: number
  confirmedCount: number
  avgConfirmTime: number
  tps: number
}

interface ConnectionStatus {
  connected: boolean
  address?: string
  chainId?: number
  blockNumber?: string
  error?: string
}

export function useBlockchain() {
  const { addTx, confirmTx } = useGameStore()

  const [metrics, setMetrics] = useState<TxMetrics>({
    pendingCount: 0,
    confirmedCount: 0,
    avgConfirmTime: 0,
    tps: 0
  })

  const [txTimes, setTxTimes] = useState<number[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [mockMode, setMockMode] = useState(true)
  const [serverAddress, setServerAddress] = useState<string>('')
  const [chainId, setChainId] = useState<number>(85300)

  // Check server connection status
  useEffect(() => {
    fetch('/api/tx')
      .then(res => res.json())
      .then((data: ConnectionStatus) => {
        if (data.connected) {
          setIsConnected(true)
          setMockMode(false)
          setServerAddress(data.address || '')
          setChainId(data.chainId || 85300)
        } else {
          setIsConnected(false)
          setMockMode(true)
        }
      })
      .catch(() => {
        setIsConnected(false)
        setMockMode(true)
      })
  }, [])

  // Update metrics after transaction confirmation
  const updateMetrics = useCallback((startTime: number, txHash: string) => {
    const endTime = Date.now()
    const actualTime = endTime - startTime

    confirmTx(txHash)

    setTxTimes(prev => {
      const newTimes = [...prev, actualTime].slice(-100)
      const avg = newTimes.reduce((a, b) => a + b, 0) / newTimes.length
      const tps = newTimes.length / (newTimes.reduce((a, b) => a + b, 0) / 1000) || 0

      setMetrics(m => ({
        ...m,
        pendingCount: Math.max(0, m.pendingCount - 1),
        confirmedCount: m.confirmedCount + 1,
        avgConfirmTime: Math.round(avg),
        tps: Math.round(tps * 10) / 10
      }))

      return newTimes
    })
  }, [confirmTx])

  // Mock transaction for when blockchain is not connected
  const simulateTx = useCallback((type: string, data: Record<string, unknown>) => {
    const txHash = keccak256(toHex(`${Date.now()}-${Math.random()}-${JSON.stringify(data)}`))
    const startTime = Date.now()

    addTx({
      hash: txHash,
      type: type as 'move' | 'score' | 'death',
      data,
      timestamp: startTime,
      confirmed: false
    })

    setMetrics(prev => ({ ...prev, pendingCount: prev.pendingCount + 1 }))

    setTimeout(() => {
      updateMetrics(startTime, txHash)
    }, 10 + Math.random() * 40)
  }, [addTx, updateMetrics])

  // Fire-and-forget transaction via server API
  const fireTransaction = useCallback((
    action: 'startGame' | 'recordMove' | 'endGame',
    params: Record<string, unknown>,
    type: 'move' | 'score' | 'death',
    data: Record<string, unknown>
  ) => {
    const startTime = Date.now()
    const tempHash = keccak256(toHex(`pending-${Date.now()}-${Math.random()}`))

    // Immediate UI update
    addTx({
      hash: tempHash,
      type,
      data,
      timestamp: startTime,
      confirmed: false
    })
    setMetrics(prev => ({ ...prev, pendingCount: prev.pendingCount + 1 }))

    // Send transaction via server API (fire-and-forget)
    fetch('/api/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          updateMetrics(startTime, tempHash)
        } else {
          console.error('Transaction failed:', result.error)
          setMetrics(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }))
        }
      })
      .catch(err => {
        console.error('Transaction error:', err)
        setMetrics(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }))
      })
  }, [addTx, updateMetrics])

  // Game start
  const startGame = useCallback(() => {
    if (mockMode) {
      simulateTx('score', { action: 'start' })
    } else {
      fireTransaction('startGame', {}, 'score', { action: 'start' })
    }
  }, [mockMode, simulateTx, fireTransaction])

  // Record move (fully async - no game blocking)
  const recordMove = useCallback((direction: string, position: { x: number; z: number }) => {
    if (mockMode) {
      simulateTx('move', { direction, ...position })
    } else {
      const directionMap: Record<string, number> = { forward: 0, back: 1, left: 2, right: 3 }
      fireTransaction(
        'recordMove',
        {
          direction: directionMap[direction] || 0,
          x: Math.floor(Math.abs(position.x) * 1000).toString(),
          z: Math.floor(Math.abs(position.z) * 1000).toString()
        },
        'move',
        { direction, ...position }
      )
    }
  }, [mockMode, simulateTx, fireTransaction])

  // End game
  const endGame = useCallback((score: number) => {
    if (mockMode) {
      simulateTx('death', { score })
    } else {
      fireTransaction('endGame', { score: score.toString() }, 'death', { score })
    }
  }, [mockMode, simulateTx, fireTransaction])

  return {
    isConnected,
    address: serverAddress,
    chainId,
    mockMode,
    metrics,
    recordMove,
    startGame,
    endGame
  }
}
