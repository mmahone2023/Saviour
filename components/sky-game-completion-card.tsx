'use client';

import { Card } from '@/components/ui/card';
import type { ReactNode } from 'react';
import { useState } from 'react';

type SkyGameCompletionCardProps = {
  /** Shown after "Amazing! You completed " — e.g. "the Sky Challenge!" */
  completedPhrase: string;
  hearts: number;
  /** Optional line under the hearts count */
  tagline?: ReactNode;
  /** Primary + secondary actions (buttons or links) */
  actions: ReactNode;
  /** Temporarily disables completion actions while celebration audio is playing. */
  actionsDisabled?: boolean;
  /** Hover hint shown while actions are disabled. */
  disabledHoverMessage?: string;
};

/**
 * Shared full-game completion overlay for sky games: star, “Amazing! You completed…”, hearts.
 */
export function SkyGameCompletionCard({
  completedPhrase,
  hearts,
  tagline,
  actions,
  actionsDisabled = false,
  disabledHoverMessage,
}: SkyGameCompletionCardProps) {
  const [showDisabledHoverHint, setShowDisabledHoverHint] = useState(false);

  return (
    <div className="absolute inset-0 z-[10100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-gradient-to-b from-yellow-100 to-yellow-50 p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl" aria-hidden>
          ⭐
        </div>
        <h2 className="mb-3 text-3xl font-bold text-yellow-900">
          Amazing! You completed {completedPhrase}  Celebrate to the victory anthem!
        </h2>
        <p className={`text-2xl font-bold text-yellow-600 ${tagline ? 'mb-2' : 'mb-6'}`}>Total Hearts: {hearts}/5</p>
        {tagline ? <div className="mb-6 text-lg text-yellow-800">{tagline}</div> : null}
        <div
          className="relative"
          onMouseEnter={() => {
            if (actionsDisabled && disabledHoverMessage) {
              setShowDisabledHoverHint(true);
            }
          }}
          onMouseLeave={() => setShowDisabledHoverHint(false)}
        >
          {showDisabledHoverHint && disabledHoverMessage ? (
            <div className="absolute -top-16 left-1/2 z-10 w-80 max-w-[95%] -translate-x-1/2 rounded-md bg-slate-900/95 px-3 py-2 text-sm font-medium text-white shadow-lg">
              {disabledHoverMessage}
            </div>
          ) : null}
          <div
            className={`flex flex-col gap-3 sm:flex-row sm:justify-center ${actionsDisabled ? 'opacity-70' : ''}`}
            aria-disabled={actionsDisabled}
          >
            {actions}
          </div>
        </div>
      </Card>
    </div>
  );
}
