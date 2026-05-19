# Cockatiel

Local-first audio annotation tool with WebAssembly VAD segmentation and multi-format export (EAF, SRT, TextGrid, CSV).

## Features

- **Automatic segmentation** — voice activity detection via Silero VAD (WebAssembly) or energy-based fallback
- **Waveform editor** — drag, resize, split, merge, and delete segments directly on the waveform
- **Speaker assignment** — assign segments to speakers with configurable names and colours
- **Looping playback** — click a region to loop it while transcribing
- **Keyboard-driven workflow** — split (S), delete (Delete), merge (M), navigate ([/]), skip (←/→), and more. Press `?` to see all shortcuts
- **Multi-format export** — EAF (ELAN), SRT, TextGrid (Praat), CSV, and plain text
- **Privacy first** — all processing runs locally in the browser; no audio leaves your device

## Getting started

```bash
pnpm install
pnpm run download:wasm   # fetch Silero VAD WASM binary
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) and drop an audio file to begin.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint:biome` | Lint and format with Biome |
| `pnpm lint:knip` | Find unused code with Knip |
| `pnpm lint:types` | Type-check with TypeScript |
| `pnpm test` | Run tests with Vitest |

## Tech stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) — build tool
- [wavesurfer.js](https://wavesurfer.xyz) — waveform rendering and audio playback
- [Zustand](https://zustand.docs.pmnd.rs) — state management
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Silero VAD](https://github.com/snakers4/silero-vad) — voice activity detection (WASM)
- [Biome](https://biomejs.dev) — linting and formatting
- [Lefthook](https://github.com/evilmartians/lefthook) — git hooks

## Hosting

Cockatiel uses `SharedArrayBuffer` (for the Silero VAD pthread workers), which
requires the page to be **cross-origin isolated**. That in turn requires the
host to send:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`

The Vite dev and preview servers set these headers automatically (see
`vite.config.ts`). On GitHub Pages — which cannot send custom response
headers — we ship the [`coi-serviceworker`](https://github.com/gzuidhof/coi-serviceworker)
shim, which registers a service worker that injects the headers on every
request. The `credentialless` mode (rather than `require-corp`) is what lets
cockatiel still fetch public audio URLs from catalogue servers that don't set
`Cross-Origin-Resource-Policy`.

## Licence

MIT
