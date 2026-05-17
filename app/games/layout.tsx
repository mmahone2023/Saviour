import { SaviourThemeAudioProvider } from '@/app/games/saviour-theme-audio-provider';

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <SaviourThemeAudioProvider>{children}</SaviourThemeAudioProvider>;
}
