'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/store/gameStore'
import { useBlockchain } from '@/hooks/useBlockchain'
import { ScoreBoard, TxMetrics, StartScreen, GameOverScreen } from '@/components/ui/GameUI'

// Dynamic import for Three.js to avoid SSR issues
const Game = dynamic(
  () => import('@/components/game/Game').then(mod => ({ default: mod.Game })),
  { ssr: false }
)

export default function Home() {
  const { isPlaying, isGameOver, score, playerPosition } = useGameStore()
  const { recordMove, startGame: startGameTx, endGame: endGameTx } = useBlockchain()
  const prevIsPlaying = useRef(false)
  const prevIsGameOver = useRef(false)

  // Record moves on chain (fire-and-forget)
  const handleMove = (direction: string, position: { x: number; z: number }) => {
    recordMove(direction, position)
  }

  // Record game start on chain (fire-and-forget)
  useEffect(() => {
    if (isPlaying && !prevIsPlaying.current) {
      startGameTx()
    }
    prevIsPlaying.current = isPlaying
  }, [isPlaying, startGameTx])

  // Record game over on chain (fire-and-forget)
  useEffect(() => {
    if (isGameOver && !prevIsGameOver.current) {
      endGameTx(score)
    }
    prevIsGameOver.current = isGameOver
  }, [isGameOver, score, endGameTx])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4">
        <h1 className="text-white font-bold text-xl">
          🐔 CipherCross
        </h1>
      </div>

      {/* Game Canvas */}
      <div className="w-full h-full">
        <Game onMove={handleMove} />
      </div>

      {/* UI Overlays */}
      {isPlaying && (
        <>
          <ScoreBoard />
          <TxMetrics />
        </>
      )}

      {/* Screens */}
      {!isPlaying && !isGameOver && <StartScreen />}
      {isGameOver && <GameOverScreen />}

      {/* Performance indicator */}
      <div className="absolute bottom-4 left-4 text-xs text-white/50">
        Powered by CipherBFT L1
      </div>
    </main>
  )
}
