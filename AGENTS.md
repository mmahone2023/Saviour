# Agents

## Cursor Cloud specific instructions

### Overview

Saviour is a browser-based 2D RPG built with **Next.js 16** and **Phaser 3**. It is a single-service application — only the Next.js dev server needs to run. All external services (MongoDB Atlas, Resend email, Twilio SMS) are optional and degrade gracefully when their env vars are absent.

### Running the app

```
pnpm dev          # starts Next.js on http://localhost:3000
pnpm build        # production build
```

### Lint

The `pnpm lint` script calls `eslint .`, but **ESLint is not listed as a dependency** in `package.json` and no ESLint config file exists. The command will fail with `eslint: not found`. This is a pre-existing repo issue — do not treat it as an environment problem.

### Environment variables

Copy `env.example` to `.env.local`. No env vars are required for local development — the app works fully without them. See `env.example` for optional MongoDB / Resend / Twilio configuration.

### Key gotchas

- The lockfile is **pnpm** (`pnpm-lock.yaml`), even though the README mentions `npm install`. Always use `pnpm install`.
- `next.config.mjs` has `ignoreBuildErrors: true` and `images: { unoptimized: true }`, so TypeScript errors won't block builds and no image optimization libraries are needed.
- The Phaser game engine runs entirely client-side. Game pages are under `app/games/*/` and the Phaser scenes load in the browser canvas.
