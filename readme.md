# Noesis Mirror

An API-backed, person-specific 3D reading field for the Tryambakam Noesis engine. The frontend renders a walkable FalseEarth world; the Cloudflare Worker serves each person's world configuration from R2 manifests and protects the assets with CF Access + D1 grants. Proximity is the interface: as you move through the field, beacons wake up and open readings, audio, video, slides, or study guides.

## What It Is

- **Procedural field:** WebGPU grass, terrain, sky, rose field, beacons, and third-person character rendered through React Three Fiber.
- **API-backed worlds:** `/api/world/:personId` transforms an R2 `manifest.json` into the `WorldConfig` consumed by the frontend.
- **Protected assets:** `/api/assets/:personId/*` streams R2 files after JWT + grant checks, including range responses for audio/video.
- **Discovery UI:** HUD, onboarding, discovery panel, modal asset viewer, keyboard navigation, reduced-motion support, and visited-beacon persistence.
- **Routing:** `/p/:personId` loads a person's field. Example: `/p/harshita`.

## Tech Stack

- React 19 + TypeScript + Vite
- React Three Fiber 9 + Three.js WebGPU renderer + TSL
- Zustand for game/session/audio/visited state
- Tailwind CSS for UI surfaces
- Cloudflare Worker + Hono API
- Cloudflare R2 for premium assets, D1 for grants, CF Access JWT auth
- Vitest + Testing Library + jsdom

## Getting Started

```bash
npm install
npm install --prefix api

npm run dev          # frontend on http://localhost:5174
cd api && npm run dev # Worker API on http://localhost:8787
```

The frontend defaults to `https://immersiveapi.tryambakam.space`. To point local frontend work at a local Worker, set:

```bash
VITE_API_URL=http://localhost:8787 npm run dev
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build

cd api && npm run typecheck
```

## World And Asset Flow

1. Premium assets are generated into the external premium-assets tree with a per-person `manifest.json`.
2. `npm run sync -- <personId>` uploads that person's manifest and assets to the `noesis-packs` R2 bucket.
3. `api/src/lib/worldConfig.ts` maps known manifest outputs into beacons and positions them on a golden-angle spiral.
4. `GET /api/world/:personId` verifies the user's D1 grant and returns the generated `WorldConfig`.
5. `GET /api/assets/:personId/*` streams the selected protected asset to the viewer.

Static `public/packs/<personId>/world-config.json` files are no longer the live path.

## Admin CLI

The admin CLI talks to the Worker admin routes with `X-Admin-Token`. It reads `ADMIN_SECRET` and optional `API_URL` from the environment or a root `.env`.

```bash
npm run admin:persons
npm run admin:world -- <personId>
npm run admin:grants -- <email>
npm run admin:grant -- <email> <personId>
npm run admin:help
```

See [docs/admin-cli.md](docs/admin-cli.md) and [ADMIN-README.md](ADMIN-README.md) for the operator reference.

## Controls

- **WASD / Arrow keys:** Move the character
- **Arrow Up/Down/Left/Right:** Cycle beacons when no modal is open
- **G / Enter:** Open the selected or active beacon
- **Escape:** Close the asset viewer
- **H:** Toggle help
- **Q:** Cycle quality
- **R:** Respawn to origin

## Project Structure

```text
src/
├── app/App.tsx                 # WebGPU canvas and scene shell
├── app/BeamSceneContext.ts     # Secondary scene context for beam rendering
├── auth/signOut.ts             # Shared sign-out utility
├── components/WorldPage.tsx    # Route-level world loader and overlay integration
├── components/Beacon*.tsx      # In-world beacon rendering and ARIA announcement
├── components/DiscoveryPanel.tsx
├── components/AssetViewer.tsx
├── components/assetRenderers/  # Per-type asset viewers
├── components/character/       # Third-person character
├── components/grass/           # WebGPU procedural grass
├── components/Rose/            # VAT rose field
├── hooks/                      # World config, beacon keyboard/proximity, motion prefs
├── core/store/                 # Zustand stores
└── types/world.ts              # Frontend WorldConfig / Beacon contracts

api/
├── src/index.ts                # Hono Worker entry
├── src/middleware/             # CF Access and admin auth
├── src/routes/                 # grants, world, assets, admin
├── src/lib/worldConfig.ts      # R2 manifest -> WorldConfig transform
├── schema.sql                  # D1 access_grants schema
└── wrangler.toml               # Worker bindings and custom domain
```

## Release Policy

- Root `package-lock.json` and `api/package-lock.json` are tracked for reproducible app and Worker installs.
- `dist/`, `.wrangler/`, `.vite/`, `.vercel/`, `node_modules/`, `.env`, and `.dev.vars` remain local-only.
- Bundle and asset optimization work is tracked in [docs/optimization-backlog.md](docs/optimization-backlog.md).

## Attribution

The 3D renderer, procedural terrain, and character controller are derived from **False Earth** by Ming-Jyun Hung.
See [ATTRIBUTION.md](./ATTRIBUTION.md) for full details.

Noesis-specific features, API-backed world generation, protected asset viewing, discovery UI, keyboard navigation, reduced-motion support, HUD, and admin tooling are original work layered on top of that base.

## Lint / Type Notes

The False Earth renderer base (`src/components/character`, `grass`, `Rose`, `cosmic`, `background`, `Effects`, `camera`, `debug`, `core/shaders`, `core/utils`, `ui`) is imported code and excluded from ESLint. The Noesis overlay and app/API glue are linted and typechecked.

ESLint keeps `rules-of-hooks` and dependency checks strict. React Compiler immutability/ref purity rules are disabled because R3F/WebGPU code intentionally mutates Three.js refs, scene objects, materials, and uniforms outside React state.
