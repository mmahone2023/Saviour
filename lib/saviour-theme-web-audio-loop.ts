import { SAVIOUR_BACKGROUND_THEME_PATH } from '@/lib/saviour-theme-audio';

type WebkitWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function createAudioContext(): AudioContext {
  const w = window as WebkitWindow;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) {
    throw new Error('Web Audio API not supported');
  }
  return new Ctor();
}

/**
 * Gapless theme loop using Web Audio (HTMLMediaElement.loop often has an audible seam).
 */
export class SaviourThemeWebAudioLoopPlayer {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private loadPromise: Promise<AudioBuffer> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private generation = 0;
  private loadAbort: AbortController | null = null;

  private isStale(gen: number): boolean {
    return gen !== this.generation;
  }

  private async loadBuffer(): Promise<AudioBuffer> {
    if (this.buffer) return this.buffer;
    if (!this.loadPromise) {
      const gen = this.generation;
      this.loadPromise = (async () => {
        const ctx = this.ctx ?? createAudioContext();
        if (this.isStale(gen)) {
          throw new Error('Theme player disposed during load');
        }
        this.ctx = ctx;

        this.loadAbort?.abort();
        const abort = new AbortController();
        this.loadAbort = abort;

        const res = await fetch(SAVIOUR_BACKGROUND_THEME_PATH, { signal: abort.signal });
        if (this.isStale(gen)) {
          throw new Error('Theme player disposed during load');
        }
        if (!res.ok) {
          throw new Error(`Theme fetch failed: ${res.status}`);
        }
        const raw = await res.arrayBuffer();
        if (this.isStale(gen)) {
          throw new Error('Theme player disposed during load');
        }
        const copy = raw.slice(0);
        const decoded = await ctx.decodeAudioData(copy);
        if (this.isStale(gen)) {
          throw new Error('Theme player disposed during load');
        }
        this.buffer = decoded;
        return decoded;
      })().catch((err) => {
        if (this.generation === gen) {
          this.loadPromise = null;
        }
        throw err;
      });
    }
    return this.loadPromise;
  }

  stop(): void {
    try {
      this.source?.stop();
    } catch {
      /* already stopped */
    }
    this.source?.disconnect();
    this.source = null;
    this.gain?.disconnect();
    this.gain = null;
  }

  async start(): Promise<void> {
    const gen = this.generation;
    let buffer: AudioBuffer;
    try {
      buffer = await this.loadBuffer();
    } catch {
      if (this.isStale(gen)) return;
      throw new Error('Theme load failed');
    }
    if (this.isStale(gen) || !this.ctx) return;

    this.stop();
    const ctx = this.ctx;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    if (this.isStale(gen)) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    this.source = source;
    this.gain = gain;
  }

  dispose(): void {
    this.generation += 1;
    this.loadAbort?.abort();
    this.loadAbort = null;
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
    this.buffer = null;
    this.loadPromise = null;
  }
}
