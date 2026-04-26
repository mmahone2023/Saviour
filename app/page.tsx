"use client"

import { FloatingHero } from "@/components/floating-hero"
import { GameProfile } from "@/components/game-profile"
import { useRouter } from "next/navigation"

const games = [
  {
    title: "Savior of the Sea",
    image: "/images/savior-sea.jpg",
    href: "/games/sea",
    position: "top-left" as const,
  },
  {
    title: "Savior of the Land",
    image: "/images/savior-land.jpg",
    href: "/games/land",
    position: "top-right" as const,
  },
  {
    title: "Savior of the Sky",
    image: "/images/savior-sky.jpg",
    href: "/games/sky",
    position: "bottom-left" as const,
  },
  {
    title: "Saviour of the City",
    image: "/images/savior-city.jpg",
    href: "/games/city",
    position: "bottom-right" as const,
  },
]

function MobileGameButton({ title, href }: { title: string; href: string }) {
  const router = useRouter()

  const handleClick = () => {
    console.log("[v0] MobileGameButton clicked, navigating to:", href)
    router.push(href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 py-2 text-xs font-semibold text-center bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg hover:from-secondary hover:to-primary transition-all duration-300 shadow-lg cursor-pointer"
    >
      {title.replace("Savior of the ", "").replace("Saviour of the ", "")}
    </button>
  )
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-center py-6 md:py-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
            SAVIOR
          </span>
        </h1>
      </header>

      {/* Game version profiles in corners */}
      {games.map((game) => (
        <GameProfile
          key={game.title}
          title={game.title}
          image={game.image}
          href={game.href}
          position={game.position}
        />
      ))}

      {/* Center hero section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <FloatingHero />

        {/* Tagline */}
        <p className="mt-6 md:mt-8 text-center text-muted-foreground text-sm md:text-base lg:text-lg max-w-md px-4">
          A game where helping others helps you. 
        </p>
        <br></br>

        {/* Mobile game buttons */}
        <div className="md:hidden mt-8 grid grid-cols-2 gap-3 w-full max-w-xs">
          {games.map((game) => (
            <MobileGameButton key={game.title} title={game.title} href={game.href} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-4 text-center text-muted-foreground text-xs md:text-sm z-20">
        <p>Choose your destiny. Which Saviour will you become?</p>
      </footer>
    </main>
  )
}
