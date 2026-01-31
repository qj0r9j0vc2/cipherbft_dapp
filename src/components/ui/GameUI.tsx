'use client'

import { useGameStore } from '@/store/gameStore'
import { useBlockchain } from '@/hooks/useBlockchain'

export function ScoreBoard() {
  const { score, highScore } = useGameStore()

  return (
    <div className="absolute top-20 left-4 bg-black/70 text-white px-4 py-2 rounded-lg font-mono">
      <div className="text-3xl font-bold">{score}</div>
      <div className="text-sm text-gray-400">HIGH: {highScore}</div>
    </div>
  )
}

export function TxMetrics() {
  const { metrics, mockMode, isConnected, address } = useBlockchain()
  const { txHistory } = useGameStore()

  const recentTx = txHistory.slice(-5).reverse()

  return (
    <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-3 rounded-lg font-mono text-sm w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-cyan-400 font-bold">Chain Status</span>
        <span className={`px-2 py-0.5 rounded text-xs ${mockMode ? 'bg-yellow-600' : 'bg-green-600'}`}>
          {mockMode ? 'DEMO' : 'LIVE'}
        </span>
      </div>

      {isConnected && address && (
        <div className="text-xs text-gray-400 mb-2 truncate">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/10 p-2 rounded">
          <div className="text-xs text-gray-400">Avg Confirm</div>
          <div className="text-lg text-green-400">{metrics.avgConfirmTime}ms</div>
        </div>
        <div className="bg-white/10 p-2 rounded">
          <div className="text-xs text-gray-400">TPS</div>
          <div className="text-lg text-cyan-400">{metrics.tps}</div>
        </div>
      </div>

      <div className="flex justify-between text-xs mb-2">
        <span>Pending: <span className="text-yellow-400">{metrics.pendingCount}</span></span>
        <span>Confirmed: <span className="text-green-400">{metrics.confirmedCount}</span></span>
      </div>

      {/* Recent transactions */}
      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="text-xs text-gray-400 mb-1">Recent Transactions</div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {recentTx.length === 0 ? (
            <div className="text-xs text-gray-500">No transactions yet</div>
          ) : (
            recentTx.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-400 truncate w-20">
                  {tx.hash.slice(0, 10)}...
                </span>
                <span className={`px-1.5 py-0.5 rounded ${
                  tx.type === 'move' ? 'bg-blue-600' :
                  tx.type === 'score' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {tx.type}
                </span>
                <span className={tx.confirmed ? 'text-green-400' : 'text-yellow-400'}>
                  {tx.confirmed ? '✓' : '⏳'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function StartScreen() {
  const { startGame, highScore } = useGameStore()

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900/90 p-8 rounded-2xl text-center max-w-md">
        <h1 className="text-4xl font-bold text-white mb-2">
          🐔 CipherCross
        </h1>
        <p className="text-gray-400 mb-6">
          Cross the road, river, and more!<br />
          Every move is recorded on-chain.
        </p>

        {highScore > 0 && (
          <div className="text-yellow-400 mb-4">
            High Score: {highScore}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left text-sm">
          <div className="text-gray-300 font-semibold mb-2">Controls:</div>
          <div className="grid grid-cols-2 gap-2 text-gray-400">
            <div>↑ / W - Forward</div>
            <div>↓ / S - Back</div>
            <div>← / A - Left</div>
            <div>→ / D - Right</div>
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
        >
          START GAME
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Powered by CipherBFT - Ultra-fast L1
        </p>
      </div>
    </div>
  )
}

export function GameOverScreen() {
  const { score, highScore, startGame } = useGameStore()
  const { metrics } = useBlockchain()

  const isNewHighScore = score >= highScore && score > 0

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900/90 p-8 rounded-2xl text-center max-w-md">
        <h2 className="text-3xl font-bold text-red-500 mb-4">
          GAME OVER
        </h2>

        {isNewHighScore && (
          <div className="text-yellow-400 text-xl mb-2 animate-pulse">
            🎉 NEW HIGH SCORE! 🎉
          </div>
        )}

        <div className="text-6xl font-bold text-white mb-2">
          {score}
        </div>
        <div className="text-gray-400 mb-6">
          Best: {Math.max(score, highScore)}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="text-gray-300 font-semibold mb-2">Session Stats</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Transactions</div>
              <div className="text-cyan-400 text-xl">{metrics.confirmedCount}</div>
            </div>
            <div>
              <div className="text-gray-500">Avg Confirm Time</div>
              <div className="text-green-400 text-xl">{metrics.avgConfirmTime}ms</div>
            </div>
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  )
}

export function MobileControls() {
  const { isPlaying, movePlayer } = useGameStore()

  if (!isPlaying) return null

  const buttonClass = "w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-2xl active:bg-white/40 transition-colors"

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:hidden">
      <div className="grid grid-cols-3 gap-2">
        <div />
        <button className={buttonClass} onClick={() => movePlayer('forward')}>↑</button>
        <div />
        <button className={buttonClass} onClick={() => movePlayer('right')}>←</button>
        <button className={buttonClass} onClick={() => movePlayer('back')}>↓</button>
        <button className={buttonClass} onClick={() => movePlayer('left')}>→</button>
      </div>
    </div>
  )
}
