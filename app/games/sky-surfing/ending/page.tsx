'use client';

import Image from 'next/image';
import Link from 'next/link';

const LYRICS = [
  ['I hope you wanna be a Saviour', 'Because somebody needs a favor', "Even if you're not up for it", 'Somebody still needs a Saviour'],
  [
    'Have you ever seemed to notice',
    'that smiles are contagious?',
    'Just like a deed accomplished',
    'helping makes you feel better, better',
  ],
  [
    "You're going through it or not into it",
    'But you see or know someone that needs help',
    'We tend to put ourself before someone else',
    'When we can help ourself, AND someone else',
  ],
  [
    "And the thing about it, 'cause there's no doubt about it",
    "Someone has helped you when you've been in need",
    'So you should make some space, to make a change, so your actions benefit you and me',
  ],
] as const;

export default function SkySurfingEndingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-700" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center py-8 text-center">
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-cyan-300/50 shadow-2xl shadow-cyan-400/30 mb-5 shrink-0">
          <Image
            src="/images/savior-sky.jpg"
            alt="Air Surfing"
            width={144}
            height={144}
            className="object-cover w-full h-full"
          />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100/90 mb-1">Air Surfing</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-10 drop-shadow-lg">Ending</h1>

        <article className="w-full max-w-lg rounded-2xl border border-white/25 bg-black/25 px-5 py-6 text-left shadow-xl backdrop-blur-md mb-12">
          <h2 className="text-center text-xl md:text-2xl font-bold text-white mb-6 drop-shadow-md">Lyrics to Saviour</h2>
          <div className="space-y-6 text-cyan-50/95 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium">
            {LYRICS.map((stanza, i) => (
              <p key={i} className="text-center md:text-left">
                {stanza.join('\n')}
              </p>
            ))}
          </div>
        </article>

        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Link
            href="/landing"
            className="flex-1 rounded-lg border-2 border-white/50 px-6 py-3 text-center font-semibold text-white hover:bg-white/10 transition"
          >
            Back Home
          </Link>
          <Link
            href="/games/sky-surfing"
            className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-center font-semibold text-white shadow-lg transition hover:from-cyan-400 hover:to-blue-500"
          >
            Intro
          </Link>
        </div>
      </div>
    </main>
  );
}
