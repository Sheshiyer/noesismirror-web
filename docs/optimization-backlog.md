# Optimization Backlog

Captured after the lint/docs cleanup pass so performance work has a home separate from feature and infrastructure plans.

## Current Evidence

- `npm run build` succeeds, but Vite warns that chunks exceed 500 kB.
- Main app chunk observed during review: about 2.74 MB minified / 836 kB gzip.
- Debug console chunk observed during review: about 506 kB minified / 160 kB gzip.
- `public/` is about 401 MB; `dist/` after build is about 417 MB.
- Largest committed public beacon assets observed: `part-5.glb` about 31 MB, `compendium.glb` about 29 MB, `closing.glb` about 24 MB.

## Work Items

| ID | Item | Why | First Probe |
|---|---|---|---|
| OPT-001 | Add a bundle visualizer or rollup stats report | Makes chunk ownership visible before splitting | Generate a build report and list top modules |
| OPT-002 | Split vendor chunks for Three/R3F, MUI, Leva, and markdown/viewer code | Reduces initial route payload and improves cache reuse | Compare `dist/assets/*.js` before/after manual chunks |
| OPT-003 | Keep `eruda` strictly debug-only and confirm it never loads outside `?debug=true` | Debug tooling is a large separate chunk | Browser network trace on normal and debug routes |
| OPT-004 | Optimize largest beacon GLBs with meshopt/Draco where compatible with WebGPU loader path | Reduces static asset weight and field load time | Rebuild three largest GLBs and compare visual output |
| OPT-005 | Define asset size budgets for public models and generated beacons | Prevents future 20+ MB assets landing unnoticed | Add a script that fails over configured per-file limits |
| OPT-006 | Lazy-load distant beacon GLBs by proximity or visibility band | Avoids loading every beacon model up front | Profile initial route load with and without eager beacons |
| OPT-007 | Review duplicated `public/` -> `dist/` asset payload in release packaging | Keeps deploy artifacts smaller and easier to inspect | Compare deployment upload manifest before/after cleanup |
| OPT-008 | Document supported compression formats for avatar, rose, and beacon assets | Prevents one-off asset decisions from drifting | Add an asset pipeline note with accepted formats |

## Guardrails

- Do not optimize assets by changing their visual identity without screenshot comparison.
- Keep runtime verification on `/p/<personId>` after any loader or compression change.
- Prefer measurable before/after probes over speculative cleanup.
