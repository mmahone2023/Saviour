"use client"

import Image from "next/image"
import { SaviorStar } from "./savior-star"

export function FloatingHero() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Glow effect behind hero */}
      <div className="absolute w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-gradient-radial from-primary/30 via-secondary/20 to-transparent rounded-full blur-3xl" />
      
      {/* Hero container with floating animation */}
      <div 
        className="relative"
        style={{
          animation: "float 3s ease-in-out infinite, glow-pulse 2s ease-in-out infinite"
        }}
      >
        <div className="relative w-48 h-64 md:w-64 md:h-80 lg:w-80 lg:h-96">
          <Image
            src="/images/savior-hero.jpg"
            alt="Savior - The Superhero"
            fill
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>
        
        {/* Star emblem overlay - positioned on chest area */}
        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 opacity-90">
          <SaviorStar className="w-full h-full" />
        </div>
      </div>

      {/* Hero name */}
      <h2 className="mt-4 md:mt-6 text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent drop-shadow-lg">
        SAVIOR
      </h2>
    </div>
  )
}
