import { NextResponse } from "next/server"

// Temporary in-memory leaderboard (resets when server restarts)
let leaderboard: { user: string; score: number }[] = []

// 🧩 Helper to decode base64url safely
function safeDecodeBase64(str: string) {
  try {
    return atob(str.replace(/-/g, "+").replace(/_/g, "/"))
  } catch {
    return ""
  }
}

// 🧠 Decode JWT token and log it
function decodeToken(token: string) {
  try {
    console.log("🧩 Raw token received:", token)
    const parts = token.split(".")
    if (parts.length < 2) {
      console.warn("⚠️ Invalid token format (expected header.payload.signature)")
      return null
    }

    const header = JSON.parse(safeDecodeBase64(parts[0]))
    const payload = JSON.parse(safeDecodeBase64(parts[1]))

    console.log("📦 Decoded header:", header)
    console.log("📦 Decoded payload:", payload)

    return payload
  } catch (err) {
    console.error("❌ Token decode error:", err)
    return null
  }
}

// --- GET: return leaderboard ---
export async function GET() {
  console.log("📤 [GET] /api/leaderboard")
  const sorted = leaderboard.sort((a, b) => b.score - a.score)
  console.table(sorted)
  return NextResponse.json(sorted)
}

// --- POST: submit score ---
export async function POST(request: Request) {
  console.log("📥 [POST] /api/leaderboard")

  // Extract cookie
  const cookieHeader = request.headers.get("cookie") || ""
  console.log("🍪 Cookie header:", cookieHeader)

  const token = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("token="))
    ?.split("=")[1]

  // Parse optional JSON body (client sends user + score)
  let bodyData: any = {}
  try {
    bodyData = await request.json()
    console.log("📨 JSON body received:", bodyData)
  } catch {
    console.warn("⚠️ No JSON body found or parse failed.")
  }

  if (!token) {
    console.warn("⚠️ No token found in cookie header")
    return NextResponse.json({ error: "Missing token" }, { status: 401 })
  }

  // Decode token
  const payload = decodeToken(token)
  console.log("🔍 Decoded payload after parsing:", payload)

  // Determine username and score
  const username = payload?.user || bodyData?.user || "Guest"
  const score = bodyData?.score ?? payload?.score ?? 0

  console.log(`👤 User: ${username}`)
  console.log(`🎯 Score received: ${score}`)

  if (!username) {
    console.warn("⚠️ Missing username in token or body.")
    return NextResponse.json({ error: "Invalid user" }, { status: 400 })
  }

  if (typeof score !== "number" || isNaN(score)) {
    console.warn("⚠️ Invalid score value:", score)
    return NextResponse.json({ error: "Invalid score" }, { status: 400 })
  }

  // Update leaderboard
  const existing = leaderboard.find((p) => p.user === username)
  if (existing) {
    const oldScore = existing.score
    existing.score = Math.max(existing.score, score)
    console.log(`🔄 Updated ${username}'s score: ${oldScore} → ${existing.score}`)
  } else {
    leaderboard.push({ user: username, score })
    console.log(`🆕 Added new player: ${username} (${score})`)
  }

  console.table(leaderboard)
  return NextResponse.json({ success: true, leaderboard })
}
