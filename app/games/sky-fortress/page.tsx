'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

export default function SkyFortressPage() {
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
    <main className="w-full min-h-screen bg-gradient-to-b from-sky-300 to-blue-600 flex flex-col">
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/20 p-4 flex justify-end">
        <div className="relative" ref={menuRef}>
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
                🏝️ Sky Islands
              </Link>
              <Link
                href="/games/sky-fortress"
                className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                🏰 Sky Fortress (Current)
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
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            🏰 Sky Fortress
          </h1>
          <p className="text-2xl text-white/90 drop-shadow-md">
            Earn all five rescue hearts — then continue to Air Surfing when you&apos;re ready for what&apos;s next.
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm p-8 max-w-md shadow-2xl mb-8">
        <div className="space-y-4 text-gray-800">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>⚔️</span> Mission
            </h2>
            <p className="text-base leading-relaxed">
              Catch the fortress dwellers as they fall. After five successful rescues (five hearts), the celebratory popup
              appears and you can continue to Air Surfing or return home from the screens that follow.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>🎮</span> How to Play
            </h2>
            <ul className="text-base space-y-1">
              <li>• Use <strong>Arrow Keys</strong> to move</li>
              <li>• Catch falling dwellers — one heart per rescue (five total)</li>
              <li>• The &quot;5 hearts&quot; popup appears only after your fifth successful save</li>
              <li>• Then continue to Air Surfing or exit from the screens that follow</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>👥</span> Characters
            </h2>
            <div className="space-y-1 text-sm">
              <p>⚔️ Knight - A skilled defender</p>
              <p>🛡️ Guard - The fortress guardian</p>
              <p>👑 Noble - A castle dweller</p>
              <p>🧙 Mage - The mystical protector</p>
              <p>🏰 Warden - The fortress keeper</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-sky-100 to-blue-100 p-3 rounded-lg">
            <p className="text-sm font-semibold text-blue-900">
              ⭐ Tip: Later drops can feel faster — stay centered. Completion popups unlock only once you&apos;ve earned all five hearts.
            </p>
          </div>
        </div>
        </Card>

        <div className="flex gap-4">
          <Link
            href="/games/sky-fortress/play"
            className="px-8 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-lg rounded-lg hover:from-green-300 hover:to-emerald-400 transition transform hover:scale-105 shadow-lg"
          >
            🚀 Start Game
          </Link>
          <Link
            href="/landing"
            className="px-8 py-4 bg-white/30 hover:bg-white/50 text-white font-bold text-lg rounded-lg transition border-2 border-white/50"
          >
            Back Home
          </Link>
        </div>

      <div className="mt-12 text-white/70 text-sm text-center max-w-md">
        <p>Five rescues, five hearts — then the congratulations popup and your next choices unlock.</p>
      </div>
      </div>
    </main>
  );
}
