"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"

interface GameProfileProps {
  title: string
  image: string
  href: string
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export function GameProfile({ title, image, href, position }: GameProfileProps) {
  const router = useRouter()
  
  const positionClasses = {
    "top-left": "top-4 left-4 md:top-8 md:left-8 lg:top-12 lg:left-12",
    "top-right": "top-4 right-4 md:top-8 md:right-8 lg:top-12 lg:right-12",
    "bottom-left": "bottom-4 left-4 md:bottom-8 md:left-8 lg:bottom-12 lg:left-12",
    "bottom-right": "bottom-4 right-4 md:bottom-8 md:right-8 lg:bottom-12 lg:right-12",
  }

  const handleClick = () => {
    console.log("[v0] GameProfile button clicked, navigating to:", href)
    router.push(href)
  }

  return (
    <div
      className={`absolute ${positionClasses[position]} flex flex-col items-center gap-2 md:gap-3 z-50`}
    >
      <button 
        type="button"
        onClick={handleClick}
        className="relative group cursor-pointer"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-full opacity-75 blur group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-primary/50 bg-card">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </button>
      <button
        type="button"
        onClick={handleClick}
        className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full hover:from-secondary hover:to-primary transition-all duration-300 shadow-lg hover:shadow-primary/50 whitespace-nowrap text-center cursor-pointer"
      >
        {title.replace("Savior of the ", "").replace("Saviour of the ", "")}
      </button>
    </div>
  )
}
