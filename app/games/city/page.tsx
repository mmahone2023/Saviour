"use client"

import Image from "next/image"
import Link from "next/link"

export default function CityGamePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      
      {/* Animated City Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-orange-900/50 to-slate-950" />
      
      {/* Glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">

        {/* Profile Image */}
        <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-4 border-orange-400/50 shadow-2xl shadow-orange-500/30 mb-6 relative">
          <Image
            src="/images/savior-city.jpg"
            alt="Saviour of the City"
            fill
            className="object-cover rounded-full"
          />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-orange-300 mb-4 drop-shadow-[0_0_20px_rgba(255,140,0,0.9)]">
          Saviour of the City
        </h1>

        {/* Description */}
        <p className="text-orange-100/90 max-w-md mb-10 text-lg drop-shadow-[0_0_10px_rgba(255,140,0,0.7)]">
          Patrol the urban jungle and keep the metropolis safe from criminal masterminds.
        </p>

        {/* Buttons */}
        <div className="flex gap-4">

          {/* Play Button */}
          <Link
            href="/games/city/game"
            className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl shadow-lg 
            hover:from-orange-400 hover:to-red-500 
            hover:shadow-[0_0_30px_rgba(255,140,0,0.9)] 
            hover:scale-105 
            transition-all duration-300"
          >
            ▶ Play Now
          </Link>

          {/* Back Button */}
          <Link
            href="/landing"
            className="px-10 py-4 border-2 border-orange-400/50 text-orange-300 font-semibold rounded-xl 
            hover:bg-orange-400/10 
            hover:shadow-[0_0_20px_rgba(255,140,0,0.6)] 
            hover:scale-105 
            transition-all duration-300"
          >
            ⬅ Back Home
          </Link>

        </div>
      </div>
    </main>
  )
}