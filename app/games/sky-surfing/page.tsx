'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function SkySurfingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-700" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-cyan-300/50 shadow-2xl shadow-cyan-400/30 mb-6">
          <Image
            src="/images/savior-sky.jpg"
            alt="Air Surfing"
            width={160}
            height={160}
            className="object-cover w-full h-full"
          />
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          Air Surfing
        </h1>

        <p className="text-cyan-100/90 max-w-md mb-6 text-lg">
          Strong winds are blowing characters across the sky! Surf through the air and intercept them before they
          drift off the edge. Each rescue earns one heart — save all five to complete the challenge.
        </p>

        <div
          role="alert"
          className="max-w-lg w-full mb-8 rounded-xl border-2 border-amber-300/80 bg-amber-950/40 px-5 py-4 text-left shadow-lg backdrop-blur-sm"
        >
          <p className="text-sm font-bold uppercase tracking-wide text-amber-200 mb-2">Before you play</p>
          <p className="text-amber-50/95 text-sm md:text-base leading-relaxed">
            Each level asks you to save more people before you can advance. You must rescue{' '}
            <strong className="text-white">1</strong>, then <strong className="text-white">2</strong>, then{' '}
            <strong className="text-white">3</strong>, then <strong className="text-white">4</strong>, then{' '}
            <strong className="text-white">5</strong> drifting characters (one wave per level). Pick everyone up, then
            fly off the top of the screen to finish that level and earn a heart.
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/games/sky-surfing/play"
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg"
          >
            ▶ Play Now
          </Link>

          <Link
            href="/"
            className="px-8 py-3 border-2 border-white/50 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
          >
            Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}
