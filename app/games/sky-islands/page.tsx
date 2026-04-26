'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

export default function SkyIslandsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-800" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-yellow-300/20 to-transparent" />
      </div>

      <div className="absolute top-4 right-4 z-20" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded text-white font-semibold transition"
          aria-label="Game menu"
        >
          ☰
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gradient-to-b from-blue-900 to-blue-800 border border-white/30 rounded-lg shadow-lg z-50">
            <Link
              href="/games/sky-city"
              className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 first:rounded-t-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              🏙️ Sky City Rescue
            </Link>
            <Link
              href="/games/sky-islands"
              className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              🏝️ Sky Islands (Current)
            </Link>
            <Link
              href="/games/sky-fortress"
              className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              🏰 Sky Fortress
            </Link>
            <Link
              href="/games/sky"
              className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition last:rounded-b-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              ← Back to Sky Games
            </Link>
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="text-7xl md:text-8xl mb-6">🏝️</div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          Sky Islands
        </h1>

        <p className="text-sky-100/90 max-w-md mb-8 text-lg">
          People are falling from the floating islands! Rescue them and earn hearts. Five levels of sky-saving adventure!
        </p>

        <div className="flex gap-4">
          <Link
            href="/games/sky-islands/play"
            className="px-8 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold rounded-lg hover:from-sky-300 hover:to-blue-400 transition-all shadow-lg"
          >
            ▶ Play Now
          </Link>

          <Link
            href="/games/sky"
            className="px-8 py-3 border-2 border-white/50 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
          >
            Back to Sky Game
          </Link>
        </div>
      </div>
    </main>
  );
}
