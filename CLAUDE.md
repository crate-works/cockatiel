# Cockatiel — project conventions

## Scripts

Prefer the project's `pnpm` scripts over raw tool invocations:

- `pnpm lint:types` — TypeScript type-check (`tsc --noEmit`)
- `pnpm lint:biome` — Biome lint/format check
- `pnpm lint:knip` — unused exports / dependencies
- `pnpm test` — Vitest (one-shot)
- `pnpm test:watch` — Vitest (watch)
- `pnpm dev` — Vite dev server (NEVER offer to run this — the dev server is always already running)
- `pnpm build` — production build
- `pnpm routes:generate` — regenerate the TanStack Router tree (`src/routeTree.gen.ts`)

## Routing

- TanStack Router, file-based: routes live in `src/routes/`, the route tree is generated into `src/routeTree.gen.ts` (committed, Biome/knip-ignored, not hand-edited).
- The dev server and `vite build` regenerate the tree automatically; `pnpm lint:types`/`pnpm build` read the committed file, so after adding/removing/renaming a route run `pnpm routes:generate` and commit the result.
- `basepath` comes from `import.meta.env.BASE_URL`; the persistent layout + media-load orchestration live in `src/routes/__root.tsx` and reach leaf routes via `src/app-shell.ts`.

## Imports

- `lucide-react` icons: always use the `Icon`-suffixed alias (e.g. `PlayIcon`, `Loader2Icon`), never the bare name.
