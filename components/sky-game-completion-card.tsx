'use client';

import { Card } from '@/components/ui/card';
import type { ReactNode } from 'react';

type SkyGameCompletionCardProps = {
  /** Shown after "Amazing! You completed " — e.g. "the Sky Challenge!" */
  completedPhrase: string;
  hearts: number;
  /** Optional line under the hearts count */
  tagline?: ReactNode;
  /** Primary + secondary actions (buttons or links) */
  actions: ReactNode;
};

/**
 * Shared full-game completion overlay for sky games: star, “Amazing! You completed…”, hearts.
 */
export function SkyGameCompletionCard({
  completedPhrase,
  hearts,
  tagline,
  actions,
}: SkyGameCompletionCardProps) {
  return (
    <div className="absolute inset-0 z-[10100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-gradient-to-b from-yellow-100 to-yellow-50 p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl" aria-hidden>
          ⭐
        </div>
        <h2 className="mb-3 text-3xl font-bold text-yellow-900">
          Amazing! You completed {completedPhrase}
        </h2>
        <p className={`text-2xl font-bold text-yellow-600 ${tagline ? 'mb-2' : 'mb-6'}`}>Total Hearts: {hearts}/5</p>
        {tagline ? <div className="mb-6 text-lg text-yellow-800">{tagline}</div> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">{actions}</div>
      </Card>
    </div>
  );
}
