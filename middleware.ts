import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  // Block anyone without a token when visiting /game_page
  if (!token && pathname.startsWith("/game_page")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Attempt to decode our simple base64 mock token
  try {
    if (token) {
      const parts = token.split(".")
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]))
        // If the token has no user or is empty, send them back
        if (!payload.user) {
          return NextResponse.redirect(new URL("/login", request.url))
        }
      } else {
        // invalid token structure
        return NextResponse.redirect(new URL("/login", request.url))
      }
    }
  } catch {
    // any decoding error -> redirect to login
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/game_page/:path*"],
}
