import { create } from 'zustand'

export type Lane = {
  id: number
  type: 'grass' | 'road' | 'river'
  obstacles: Obstacle[]
  speed: number
  direction: 1 | -1
}

export type Obstacle = {
  id: string
  x: number
  width: number
  type: 'car' | 'truck' | 'log' | 'tree'
}

export type Position = {
  x: number
  z: number
}

export type GameState = {
  // Game status
  isPlaying: boolean
  isGameOver: boolean
  score: number
  highScore: number

  // Player
  playerPosition: Position
  targetPosition: Position
  isMoving: boolean
  jumpProgress: number // 0 to 1 for jump animation

  // World
  lanes: Lane[]
  cameraZ: number

  // Blockchain
  pendingTxCount: number
  confirmedTxCount: number
  txHistory: TxRecord[]

  // Actions
  startGame: () => void
  endGame: () => void
  movePlayer: (direction: 'forward' | 'back' | 'left' | 'right') => void
  updatePlayerPosition: () => void
  updateObstacles: (delta: number) => void
  checkCollision: () => boolean
  addTx: (tx: TxRecord) => void
  confirmTx: (txHash: string) => void
}

export type TxRecord = {
  hash: string
  type: 'move' | 'score' | 'death'
  data: Record<string, unknown>
  timestamp: number
  confirmed: boolean
}

const LANE_WIDTH = 1
const PLAYER_BOUNDS = { minX: -5, maxX: 5 }

function generateLanes(startId: number, count: number, forceGrassCount: number = 0): Lane[] {
  const lanes: Lane[] = []

  // Pattern: sidewalk(1-2), road(3), sidewalk(1-2), road(3), construction(1)...
  let patternIndex = 0
  const patterns: Lane['type'][] = []

  // Build a repeating pattern
  for (let p = 0; p < 20; p++) {
    // 1-2 sidewalks
    const sidewalkCount = 1 + Math.floor(Math.random() * 2)
    for (let s = 0; s < sidewalkCount; s++) patterns.push('grass')

    // 3 lane road
    patterns.push('road')
    patterns.push('road')
    patterns.push('road')

    // Sometimes add construction zone
    if (Math.random() > 0.7) {
      patterns.push('river')
    }
  }

  for (let i = 0; i < count; i++) {
    const id = startId + i

    // Force first few lanes to be safe sidewalk
    let type: Lane['type']
    if (i < forceGrassCount) {
      type = 'grass'
    } else {
      type = patterns[(i - forceGrassCount) % patterns.length]
    }

    const obstacles: Obstacle[] = []
    const baseDirection = Math.random() > 0.5 ? 1 : -1 as 1 | -1
    // Each road lane in sequence has same direction
    const direction = baseDirection
    const speed = 2 + Math.random() * 2

    if (type === 'grass') {
      // Sidewalk - no obstacles
    } else if (type === 'road') {
      // Add vehicles - different speeds for different lanes feel
      const vehicleCount = 2 + Math.floor(Math.random() * 2)
      for (let j = 0; j < vehicleCount; j++) {
        const isTruck = Math.random() > 0.75
        const isBus = !isTruck && Math.random() > 0.8
        obstacles.push({
          id: `vehicle-${id}-${j}`,
          x: -10 + j * 6 + Math.random() * 2,
          width: isTruck ? 2.2 : isBus ? 2.5 : 1.2,
          type: isTruck || isBus ? 'truck' : 'car'
        })
      }
    } else {
      // Construction zone - platforms to cross
      const platformCount = 3 + Math.floor(Math.random() * 2)
      for (let j = 0; j < platformCount; j++) {
        obstacles.push({
          id: `log-${id}-${j}`,
          x: -10 + j * 5,
          width: 3 + Math.random(),
          type: 'log'
        })
      }
    }

    lanes.push({ id, type, obstacles, speed, direction })
  }

  return lanes
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  isPlaying: false,
  isGameOver: false,
  score: 0,
  highScore: 0,

  playerPosition: { x: 0, z: 0 },
  targetPosition: { x: 0, z: 0 },
  isMoving: false,
  jumpProgress: 0,

  lanes: generateLanes(0, 50, 5),
  cameraZ: -5,

  pendingTxCount: 0,
  confirmedTxCount: 0,
  txHistory: [],

  // Actions
  startGame: () => {
    set({
      isPlaying: true,
      isGameOver: false,
      score: 0,
      playerPosition: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      isMoving: false,
      jumpProgress: 0,
      lanes: generateLanes(0, 50, 5),
      cameraZ: -5,
      pendingTxCount: 0,
      confirmedTxCount: 0,
      txHistory: []
    })
  },

  endGame: () => {
    const { score, highScore } = get()
    set({
      isPlaying: false,
      isGameOver: true,
      highScore: Math.max(score, highScore)
    })
  },

  movePlayer: (direction) => {
    const { isPlaying, isMoving, playerPosition, lanes, score } = get()
    if (!isPlaying || isMoving) return

    let newX = playerPosition.x
    let newZ = playerPosition.z

    switch (direction) {
      case 'forward':
        newZ += LANE_WIDTH
        break
      case 'back':
        newZ = Math.max(0, newZ - LANE_WIDTH)
        break
      case 'left':
        newX = Math.max(PLAYER_BOUNDS.minX, newX - 1)
        break
      case 'right':
        newX = Math.min(PLAYER_BOUNDS.maxX, newX + 1)
        break
    }

    // Check for tree collision at target position
    const targetLaneIndex = Math.floor(newZ)
    const targetLane = lanes[targetLaneIndex]
    if (targetLane?.type === 'grass') {
      const blocked = targetLane.obstacles.some(obs =>
        obs.type === 'tree' && Math.abs(obs.x - newX) < 0.5
      )
      if (blocked) return
    }

    const newScore = Math.max(score, Math.floor(newZ))

    // Generate more lanes if needed
    if (newZ > lanes.length - 20) {
      const newLanes = [...lanes, ...generateLanes(lanes.length, 20)]
      set({ lanes: newLanes })
    }

    // 점프 시작
    set({
      targetPosition: { x: newX, z: newZ },
      isMoving: true,
      jumpProgress: 0,
      score: newScore
    })
  },

  updatePlayerPosition: () => {
    const { playerPosition, targetPosition, isMoving, jumpProgress } = get()
    if (!isMoving) return

    // 점프 진행 (0 -> 1)
    const newProgress = Math.min(1, jumpProgress + 0.15)

    // 부드러운 보간 (easeOutQuad)
    const eased = 1 - (1 - newProgress) * (1 - newProgress)

    const newX = playerPosition.x + (targetPosition.x - playerPosition.x) * 0.25
    const newZ = playerPosition.z + (targetPosition.z - playerPosition.z) * 0.25

    if (newProgress >= 1) {
      // 점프 완료
      set({
        playerPosition: { ...targetPosition },
        isMoving: false,
        jumpProgress: 0,
        cameraZ: targetPosition.z - 5
      })
    } else {
      set({
        playerPosition: { x: newX, z: newZ },
        jumpProgress: newProgress
      })
    }
  },

  updateObstacles: (delta) => {
    const { lanes, isPlaying, playerPosition } = get()
    if (!isPlaying) return

    // Only update visible lanes for performance
    const minZ = Math.max(0, Math.floor(playerPosition.z) - 3)
    const maxZ = Math.floor(playerPosition.z) + 15

    const updatedLanes = lanes.map((lane, index) => {
      // Skip lanes outside visible range
      if (index < minZ || index > maxZ) return lane
      if (lane.type === 'grass') return lane

      const updatedObstacles = lane.obstacles.map(obs => {
        let newX = obs.x + lane.speed * lane.direction * delta

        // Wrap around
        if (newX > 10) newX = -10
        if (newX < -10) newX = 10

        return { ...obs, x: newX }
      })

      return { ...lane, obstacles: updatedObstacles }
    })

    set({ lanes: updatedLanes })
  },

  checkCollision: () => {
    const { playerPosition, targetPosition, lanes, isPlaying, isMoving } = get()
    if (!isPlaying) return false

    // Don't check collision while moving between lanes
    if (isMoving) return false

    const laneIndex = Math.round(playerPosition.z)
    const lane = lanes[laneIndex]
    if (!lane) return false

    if (lane.type === 'road') {
      // Check vehicle collision
      for (const obs of lane.obstacles) {
        if (obs.type === 'car' || obs.type === 'truck') {
          const halfWidth = obs.width / 2
          if (
            playerPosition.x > obs.x - halfWidth - 0.25 &&
            playerPosition.x < obs.x + halfWidth + 0.25
          ) {
            return true
          }
        }
      }
    } else if (lane.type === 'river') {
      // Check train collision - hit by train = death
      for (const obs of lane.obstacles) {
        if (obs.type === 'log') {
          const halfWidth = obs.width / 2
          if (
            playerPosition.x > obs.x - halfWidth - 0.3 &&
            playerPosition.x < obs.x + halfWidth + 0.3
          ) {
            return true
          }
        }
      }
    }

    return false
  },

  addTx: (tx) => {
    set(state => ({
      txHistory: [...state.txHistory, tx],
      pendingTxCount: state.pendingTxCount + 1
    }))
  },

  confirmTx: (txHash) => {
    set(state => ({
      txHistory: state.txHistory.map(tx =>
        tx.hash === txHash ? { ...tx, confirmed: true } : tx
      ),
      pendingTxCount: state.pendingTxCount - 1,
      confirmedTxCount: state.confirmedTxCount + 1
    }))
  }
}))
