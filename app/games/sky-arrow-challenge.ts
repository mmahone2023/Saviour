import * as Phaser from 'phaser';

/** Shown when the player presses arrow keys while movement is temporarily disabled (after first rescue). */
export const SKY_ARROW_DISABLED_MESSAGES: readonly string[] = [
  'Something not working?, Virtual life in play!',
  'Sometimes life holds us back',
  "Don't let obstacles stop you from doing something good",
  'Patience.......wait for it...wait for it!',
  'The more it takes to accomplish something, the more rewarding feeling!',
  'When life gets to lifin\', just don\'t sit back, wait to get yo\' lick back!',
];

/** Highest index used for lockout messages (levels map 1→index 0 … 5→index 4). */
export const SKY_ARROW_DISABLED_MAX_INDEX = 4;

/** Lockout hint index for the current level: level 1 → 0, level 2 → 1, … capped at 4. */
export function skyArrowDisabledMessageIndexForLevel(currentLevel: number): number {
  return Math.min(SKY_ARROW_DISABLED_MAX_INDEX, Math.max(0, currentLevel - 1));
}

/** Time between arrow-lock periods (ms). */
export const SKY_ARROW_LOCK_GAP_MS = 6000;

/** Delay before the first lock period after the first successful rescue (ms). */
export const SKY_ARROW_FIRST_LOCK_DELAY_MS = 3500;

export type SkyArrowChallengeState = {
  firstRescueDone: boolean;
  /** Scene time (this.time.now) when the current lock ends; 0 = not locked. */
  lockEndTime: number;
  /** Increments each time a lock period completes; next duration = (lockStreak + 1) * 2s from streak at start. */
  lockStreak: number;
  /** When the next lock may begin (scene time). */
  nextLockAt: number;
};

export function createSkyArrowChallengeState(): SkyArrowChallengeState {
  return {
    firstRescueDone: false,
    lockEndTime: 0,
    lockStreak: 0,
    nextLockAt: 0,
  };
}

export function notifySkyArrowFirstRescue(state: SkyArrowChallengeState, now: number): void {
  if (state.firstRescueDone) return;
  state.firstRescueDone = true;
  state.nextLockAt = now + SKY_ARROW_FIRST_LOCK_DELAY_MS;
}

/**
 * Call once per frame from the scene's update().
 * While arrows are locked, repeated presses show the **same** message for the current level’s index (0–4).
 * @param lockoutMessageIndex — use {@link skyArrowDisabledMessageIndexForLevel}(currentLevel).
 * @returns true if horizontal/vertical arrow movement should be ignored this frame.
 */
export function tickSkyArrowChallenge(
  now: number,
  isPaused: boolean,
  state: SkyArrowChallengeState,
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null,
  lockoutMessageIndex: number,
  onNudge: (message: string) => void,
): boolean {
  if (!state.firstRescueDone || isPaused) {
    return false;
  }

  const clampedIndex = Math.min(SKY_ARROW_DISABLED_MAX_INDEX, Math.max(0, lockoutMessageIndex));

  if (state.lockEndTime > 0 && now < state.lockEndTime) {
    if (cursors) {
      const keys = [cursors.left, cursors.right, cursors.up, cursors.down];
      const pressed = keys.some((k) => k && Phaser.Input.Keyboard.JustDown(k));
      if (pressed) {
        const msg = SKY_ARROW_DISABLED_MESSAGES[clampedIndex];
        onNudge(msg);
      }
    }
    return true;
  }

  if (state.lockEndTime > 0 && now >= state.lockEndTime) {
    state.lockEndTime = 0;
    state.lockStreak += 1;
    state.nextLockAt = now + SKY_ARROW_LOCK_GAP_MS;
  }

  if (state.lockEndTime === 0 && now >= state.nextLockAt && state.nextLockAt > 0) {
    const durationMs = (state.lockStreak + 1) * 2000;
    state.lockEndTime = now + durationMs;
  }

  return false;
}
