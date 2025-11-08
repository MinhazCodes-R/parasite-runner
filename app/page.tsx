"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function createMockToken(payload: object) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.`
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null
  return null
}

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const router = useRouter()

  useEffect(() => {
    const existing = getCookie("token")
    if (!existing) {
      const guestToken = createMockToken({ user: "Guest" })
      const cookieString = `token=${guestToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`
      document.cookie = cookieString
      console.log("🍪 Set guest cookie:", cookieString)
    } else {
      console.log("✅ Existing token found:", existing)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    const token = createMockToken({ user: username.trim() })
    const cookieString = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`
    document.cookie = cookieString
    console.log("🔄 Updated cookie:", cookieString)

    router.push("/game_page")
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-yellow-100 to-blue-100">
      <Card className="w-[340px] p-6 rounded-3xl shadow-lg border-2 border-pink-200 bg-white/90">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-pink-600">
            👋 Hello Explorer!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 mb-4">
            Before you begin your adventure, tell us your name!
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
            <Input
              placeholder="Type your name here..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-center text-lg rounded-xl border-2 border-yellow-300 focus:border-pink-400"
              required
            />
            <Button
              type="submit"
              className="w-full text-lg py-5 bg-yellow-400 hover:bg-yellow-500 rounded-xl"
            >
              🚀 Start Game
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500 mt-2">
          <p>
            Your progress will be saved as{" "}
            <span className="font-semibold text-pink-500">
              {username || "Guest"}
            </span>
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}
