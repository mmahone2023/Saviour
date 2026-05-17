'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { SaviourThemeWebAudioLoopPlayer } from '@/lib/saviour-theme-web-audio-loop';

const SKY_PLAY_ROUTES = new Set([
  '/games/sky/play',
  '/games/sky-city/play',
  '/games/sky-islands/play',
  '/games/sky-fortress/play',
  '/games/sky-surfing/play',
]);

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

type SaviourThemeAudioContextValue = {
  setVictorySuppressTheme: (v: boolean) => void;
  setPlaySessionPaused: (v: boolean) => void;
};

const SaviourThemeAudioContext = createContext<SaviourThemeAudioContextValue | null>(null);

export function useSaviourThemeAudio(): SaviourThemeAudioContextValue {
  const ctx = useContext(SaviourThemeAudioContext);
  if (!ctx) {
    throw new Error('useSaviourThemeAudio must be used under SaviourThemeAudioProvider');
  }
  return ctx;
}

export function SaviourThemeAudioProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const path = normalizePathname(pathname);
  const playerRef = useRef<SaviourThemeWebAudioLoopPlayer | null>(null);
  const [victorySuppressTheme, setVictorySuppressTheme] = useState(false);
  const [playSessionPaused, setPlaySessionPaused] = useState(false);

  useEffect(() => {
    const player = new SaviourThemeWebAudioLoopPlayer();
    playerRef.current = player;
    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!SKY_PLAY_ROUTES.has(path)) {
      setVictorySuppressTheme(false);
      setPlaySessionPaused(false);
    }
  }, [path]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return undefined;

    const shouldPlay =
      path.startsWith('/games') &&
      !path.includes('/reflection') &&
      !(SKY_PLAY_ROUTES.has(path) && (victorySuppressTheme || playSessionPaused));

    if (!shouldPlay) {
      player.stop();
      return undefined;
    }

    let cancelled = false;
    void player.start().then(
      () => {
        if (cancelled) player.stop();
      },
      () => {},
    );

    return () => {
      cancelled = true;
      player.stop();
    };
  }, [path, victorySuppressTheme, playSessionPaused]);

  const setVictorySuppressThemeCb = useCallback((v: boolean) => {
    setVictorySuppressTheme(v);
  }, []);

  const setPlaySessionPausedCb = useCallback((v: boolean) => {
    setPlaySessionPaused(v);
  }, []);

  const value = useMemo(
    () => ({
      setVictorySuppressTheme: setVictorySuppressThemeCb,
      setPlaySessionPaused: setPlaySessionPausedCb,
    }),
    [setVictorySuppressThemeCb, setPlaySessionPausedCb],
  );

  return <SaviourThemeAudioContext.Provider value={value}>{children}</SaviourThemeAudioContext.Provider>;
}
