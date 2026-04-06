'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function SkyGamePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Sky-themed background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-800" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-yellow-300/20 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-sky-300/50 shadow-2xl shadow-sky-400/30 mb-6">
          <Image
            src="/images/savior-sky.jpg"
            alt="Savior of the Sky"
            width={160}
            height={160}
            className="object-cover w-full h-full"
          />
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          Savior of the Sky
        </h1>

        <p className="text-sky-100/90 max-w-md mb-8 text-lg">
          Soar through the clouds and help creatures in need. Earn hearts as you rescue those who are struggling.
        </p>

        <div className="flex gap-4">
          <Link
            href="/games/sky/play"
            className="px-8 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold rounded-lg hover:from-sky-300 hover:to-blue-400 transition-all shadow-lg"
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
