'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { useGameStore } from '@/store/gameStore'
import { useTouchControls } from '@/hooks/useTouchControls'
import { Character } from './Character'
import { World } from './World'

function GameCamera() {
  const { camera } = useThree()
  const { playerPosition } = useGameStore()
  const { size } = useThree()

  // Adjust zoom based on viewport width — smaller screen = zoom out more
  const zoom = Math.max(35, Math.min(70, size.width / 14))

  useFrame(() => {
    // Camera behind and below player, looking forward (up the screen)
    const targetX = playerPosition.x - 6
    const targetZ = playerPosition.z - 6

    camera.position.x += (targetX - camera.position.x) * 0.1
    camera.position.z += (targetZ - camera.position.z) * 0.1
    camera.position.y = 10

    // Look at a point ahead of the player
    camera.lookAt(playerPosition.x, 0, playerPosition.z + 5)

    // Smoothly update zoom
    if ('zoom' in camera) {
      const orthoCamera = camera as THREE.OrthographicCamera
      orthoCamera.zoom += (zoom - orthoCamera.zoom) * 0.1
      orthoCamera.updateProjectionMatrix()
    }
  })

  return (
    <OrthographicCamera
      makeDefault
      position={[-6, 10, -6]}
      zoom={zoom}
      near={0.1}
      far={1000}
    />
  )
}

function GameLoop() {
  const {
    isPlaying,
    updateObstacles,
    updatePlayerPosition,
    checkCollision,
    endGame
  } = useGameStore()

  const lastTime = useRef(Date.now())

  useFrame(() => {
    if (!isPlaying) return

    const now = Date.now()
    const delta = (now - lastTime.current) / 1000
    lastTime.current = now

    updateObstacles(delta)
    updatePlayerPosition()

    if (checkCollision()) {
      endGame()
    }
  })

  return null
}

function Lights() {
  return (
    <>
      {/* Bright ambient for daytime city */}
      <ambientLight intensity={0.8} color="#ffffff" />

      {/* Sun light */}
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Sky light */}
      <hemisphereLight
        args={['#87CEEB', '#f0f0f0', 0.5]}
      />
    </>
  )
}

function GameScene() {
  return (
    <>
      <GameCamera />
      <Lights />
      <GameLoop />
      <World />
      <Character />
    </>
  )
}

interface GameProps {
  onMove?: (direction: string, position: { x: number; z: number }) => void
}

export function Game({ onMove }: GameProps) {
  const { isPlaying, movePlayer, playerPosition } = useGameStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPlaying) return
    if (e.repeat) return // 키 반복 무시 - 한 칸씩만 이동

    let direction: 'forward' | 'back' | 'left' | 'right' | null = null

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = 'forward'
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        direction = 'back'
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = 'right'
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = 'left'
        break
    }

    if (direction) {
      e.preventDefault()
      movePlayer(direction)
      onMove?.(direction, playerPosition)
    }
  }, [isPlaying, movePlayer, playerPosition, onMove])

  const handleTouch = useCallback((direction: 'forward' | 'back' | 'left' | 'right') => {
    movePlayer(direction)
    onMove?.(direction, playerPosition)
  }, [movePlayer, playerPosition, onMove])

  useTouchControls(handleTouch, isPlaying)

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="w-full h-full">
      <Canvas shadows>
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#c9dde8', 25, 50]} />
        <GameScene />
      </Canvas>
    </div>
  )
}
