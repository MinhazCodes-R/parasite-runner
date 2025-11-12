"use client"

import { useEffect, useRef, useState } from "react"

interface GameObject {
  x: number
  y: number
  width: number
  height: number
}

interface Parasite extends GameObject {
  speed: number
}

interface Hospital extends GameObject {
  reached: boolean
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver" | "won">("menu")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30) // Updated initial time state to 30 seconds
  const startTimeRef = useRef<number | null>(null)

  const gameRef = useRef({
    player: { x: 100, y: 0, width: 30, height: 40, velocityY: 0 },
    parasites: [] as Parasite[],
    hospital: { x: 0, y: 0, width: 200, height: 250, reached: false }, // updated hospital to 250x200
    lives: 3,
    score: 0,
    gameTime: 0,
    isJumping: false,
    parallaxOffset: 0,
    lastParasiteSpawnDistance: 0,
    winStartTime: 0,
    playerMovingToHospital: false,
  })

  const drawStickFigure = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Head
    ctx.fillStyle = "#2C3E50"
    ctx.beginPath()
    ctx.arc(x, y - 25, 8, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.strokeStyle = "#2C3E50"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, y - 17)
    ctx.lineTo(x, y)
    ctx.stroke()

    // Right arm
    ctx.strokeStyle = "#2C3E50"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, y - 10)
    ctx.lineTo(x + 15, y - 15)
    ctx.stroke()

    // Left arm
    ctx.beginPath()
    ctx.moveTo(x, y - 10)
    ctx.lineTo(x - 12, y - 12)
    ctx.stroke()

    // Legs
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 8, y + 15)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 8, y + 15)
    ctx.stroke()
  }

  const drawParasite = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Parasite body (worm-like)
    ctx.fillStyle = "#9B59B6"
    ctx.beginPath()
    ctx.ellipse(x, y, 15, 12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Spikes
    ctx.strokeStyle = "#8E44AD"
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(angle) * 15, y + Math.sin(angle) * 12)
      ctx.lineTo(x + Math.cos(angle) * 22, y + Math.sin(angle) * 18)
      ctx.stroke()
    }

    // Eye
    ctx.fillStyle = "#F39C12"
    ctx.beginPath()
    ctx.arc(x - 5, y - 4, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawHospital = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Building
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(x - 100, y - 250, 200, 250) // adjusted building dimensions to 200x250

    ctx.fillStyle = "#34495E"
    ctx.fillRect(x - 40, y - 125, 80, 125)

    // Cross
    ctx.strokeStyle = "#E74C3C"
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(x - 20, y - 160)
    ctx.lineTo(x + 20, y - 160)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x, y - 180)
    ctx.lineTo(x, y - 140)
    ctx.stroke()
  }

  const drawBackground = (ctx: CanvasRenderingContext2D, offset: number, width: number, height: number) => {
    // Sky
    ctx.fillStyle = "#3498DB"
    ctx.fillRect(0, 0, width, height * 0.6)

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    const cloudX = (offset * 0.3) % (width + 100)
    ctx.beginPath()
    ctx.ellipse(cloudX, 40, 30, 15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cloudX + 200, 60, 25, 12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Additional clouds
    ctx.beginPath()
    ctx.ellipse(cloudX + 400, 50, 28, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cloudX + 600, 70, 26, 13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cloudX + 100, 80, 24, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cloudX + 500, 30, 32, 16, 0, 0, Math.PI * 2)
    ctx.fill()

    // Ground
    ctx.fillStyle = "#2ECC71"
    ctx.fillRect(0, height * 0.6, width, height * 0.4)

    // Ground pattern
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"
    ctx.lineWidth = 1
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath()
      ctx.moveTo(i - ((offset * 2) % 50), height * 0.6)
      ctx.lineTo(i - ((offset * 2) % 50), height)
      ctx.stroke()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const game = gameRef.current
    const GROUND_Y = canvas.height * 0.55
    const GRAVITY = 0.6
    const JUMP_STRENGTH = -12

    const keys: { [key: string]: boolean } = {}
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true
      if (e.code === "Space" && gameState === "playing") {
        e.preventDefault()
        if (!game.isJumping) {
          game.velocityY = JUMP_STRENGTH
          game.isJumping = true
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Mouse click for menu
    const handleCanvasClick = () => {
      if (gameState === "menu") {
        setGameState("playing")
        startTimeRef.current = Date.now()
        setTimeLeft(30) // Updated initial time to 30 seconds
        setScore(0)
        game.lives = 3
        game.score = 0
        game.gameTime = 0
        game.parasites = []
        game.player.x = 100
        game.player.y = GROUND_Y
        game.velocityY = 0
        game.parallaxOffset = 0
        game.lastParasiteSpawnDistance = 0 // Initialize lastParasiteSpawnDistance
        game.playerMovingToHospital = false // Reset this flag
      } else if (gameState === "gameOver" || gameState === "won") {
        setGameState("menu")
      }
    }

    canvas.addEventListener("click", handleCanvasClick)

    let animationId: number
    let lastSpawnTime = 0

    const gameLoop = () => {
      // Draw background
      drawBackground(ctx, game.parallaxOffset, canvas.width, canvas.height)

      if (gameState === "playing") {
        if (!startTimeRef.current) startTimeRef.current = Date.now()
        const currentTime = Date.now()
        const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000)
        const timeRemaining = Math.max(0, 30 - elapsedSeconds) // Updated timer calculation from 10 to 30 seconds

        if (timeRemaining === 0 && !game.playerMovingToHospital) {
          game.playerMovingToHospital = true
          game.hospital.x = canvas.width - 50 // moved hospital further right to align with right edge
          game.hospital.y = canvas.height * 0.6
        }

        setTimeLeft(timeRemaining)

        if (!game.playerMovingToHospital) {
          game.parallaxOffset += 3
          game.hospital.x = canvas.width + 500 // Keep hospital off-screen during gameplay
          game.hospital.y = GROUND_Y
        } else {
          game.player.x += 5

          if (
            game.player.x < game.hospital.x + 120 &&
            game.player.x + 20 > game.hospital.x - 120 &&
            game.player.y < game.hospital.y + 50 && // adjusted collision detection for taller hospital
            game.player.y + 40 > game.hospital.y - 250
          ) {
            game.player.y = -100 // player disappears when touching hospital
          }

          if (game.player.x > canvas.width + 50) {
            setGameState("won")
            return
          }
        }

        if (timeRemaining > 0 && !game.playerMovingToHospital) {
          const PARASITE_SPACING = 10 * 30
          if (game.parallaxOffset - game.lastParasiteSpawnDistance >= PARASITE_SPACING) {
            game.parasites.push({
              x: canvas.width,
              y: GROUND_Y,
              width: 30,
              height: 24,
              speed: 5 + (game.score / 1000) * 2,
            })
            game.lastParasiteSpawnDistance = game.parallaxOffset
          }
        }

        // Update player
        game.velocityY += GRAVITY
        game.player.y += game.velocityY

        if (game.player.y >= GROUND_Y) {
          game.player.y = GROUND_Y
          game.velocityY = 0
          game.isJumping = false
        }

        game.parasites = game.parasites.filter((parasite) => {
          if (game.playerMovingToHospital) return false

          parasite.x -= parasite.speed

          if (
            game.player.x < parasite.x + parasite.width &&
            game.player.x + 20 > parasite.x &&
            game.player.y < parasite.y + parasite.height &&
            game.player.y + 40 > parasite.y
          ) {
            game.lives--
            setScore(game.score)
            if (game.lives <= 0) {
              setGameState("gameOver")
              return false
            } else {
              game.player.x = 100
              game.player.y = GROUND_Y
              game.velocityY = 0
              game.parasites = []
              lastSpawnTime = currentTime
            }
          }

          return parasite.x > -50
        })

        // Score increases with time and distance
        game.score = Math.floor(game.parallaxOffset / 2 + (30 - timeRemaining) * 10)
        setScore(game.score)
      }

      // Draw player
      if (game.player.y >= -50) {
        // Only draw player if visible on screen
        drawStickFigure(ctx, game.player.x, game.player.y)
      }

      // Draw parasites
      game.parasites.forEach((parasite) => {
        drawParasite(ctx, parasite.x, parasite.y)
      })

      // Draw hospital
      if (game.playerMovingToHospital) {
        drawHospital(ctx, game.hospital.x, game.hospital.y)
      }

      // Draw UI
      ctx.fillStyle = "#2C3E50"
      ctx.font = "bold 20px Arial"
      ctx.fillText(`Score: ${score}`, 20, 30)
      ctx.fillText(`Time: ${timeLeft}s`, canvas.width - 150, 30)

      // Draw game state messages
      if (gameState === "menu") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = "#FFFFFF"
        ctx.font = "bold 48px Arial"
        ctx.textAlign = "center"
        ctx.fillText("VIRUS RUNNER", canvas.width / 2, canvas.height / 2 - 60)

        ctx.font = "24px Arial"
        ctx.fillText("Reach the hospital in 30 seconds!", canvas.width / 2, canvas.height / 2) // Updated menu text to reflect 30 second timer
        ctx.fillText("Press SPACE to jump", canvas.width / 2, canvas.height / 2 + 50)
        ctx.fillText("Click to start", canvas.width / 2, canvas.height / 2 + 100)
      } else if (gameState === "gameOver") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = "#E74C3C"
        ctx.font = "bold 48px Arial"
        ctx.textAlign = "center"
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40)

        ctx.fillStyle = "#FFFFFF"
        ctx.font = "24px Arial"
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 30)
        ctx.fillText("Click to return to menu", canvas.width / 2, canvas.height / 2 + 80)
      } else if (gameState === "won") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = "#2ECC71"
        ctx.font = "bold 48px Arial"
        ctx.textAlign = "center"
        ctx.fillText("YOU REACHED THE HOSPITAL!", canvas.width / 2, canvas.height / 2 - 40)

        ctx.fillStyle = "#FFFFFF"
        ctx.font = "24px Arial"
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 30)
        ctx.fillText("Click to return to menu", canvas.width / 2, canvas.height / 2 + 80)
      }

      ctx.textAlign = "left"
      animationId = requestAnimationFrame(gameLoop)
    }

    animationId = requestAnimationFrame(gameLoop)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      canvas.removeEventListener("click", handleCanvasClick)
      cancelAnimationFrame(animationId)
    }
  }, [gameState, score])

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold text-gray-800">🧬 Virus Runner</h1>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border-4 border-gray-800 rounded-lg shadow-lg bg-sky-300 cursor-pointer"
        />
        <div className="text-center text-gray-700">
          <p className="text-lg font-semibold">Avoid the viruses and reach the hospital!</p>
          <p className="text-sm">Press SPACE to jump • Reach the hospital within 30 seconds to win</p>{" "}
          {/* Updated instructions to reflect 30 second timer */}
        </div>
      </div>
    </main>
  )
}
