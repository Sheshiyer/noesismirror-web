# Noesis UI Overhaul — Design Spec

**Status:** Awaiting user approval.
**Visual north-star:** [docs/superpowers/specs/2026-06-30-noesis-ui-bento.png](2026-06-30-noesis-ui-bento.png) — generated via `codex-gpt-image` against the brand vault at `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/brand-docs-final/`.

## Context

The Plumber avatar (Meshy bake) is now mounted in the FalseEarth scene and reads on-brand against the rose-field world. But the surrounding UI surface — loading screen copy, ENTER button, HUD field-label position, duplicate chip strips, welcome-back chip placement — still reads as a generic Vite-template app overlay rather than a Tryambakam Noesis experience. Additionally, the beacons that the player walks toward are currently shader-only shells with no actual 3D artifact inside.

This spec resolves all of it by:
1. Generating a single visual north-star (a 9-module Figma-style component library bento board, brand-aligned)
2. Fitting the HUD / loading / modal surface to it (fixes A-G)
3. Integrating 18 baked beacon GLBs (11 freshly baked from `sankalpa/public/depth-reading/images/` 4-view sources via Meshy multi-image-to-3D this session, 7 pre-existing) behind a unified in-engine BeaconMaterial (Section H)

Brand foundation: `brand-docs-final/tryambakam-noesis-aleph/06-visual-identity.md` (Goethe colors, Kha-Ba-La gradients, Panchang/Satoshi/SF Mono type, bioluminescent principle, no-mystical-cliché rule) and `03-voice-and-tone.md` (The Anatomist Who Sees Fractals — grounded, direct, respectful-challenging).

## Decisions locked in advance

| # | Decision | Source |
|---|---|---|
| 1 | Image-as-spec: generate bento → fit UI to it, single approval gate | User answer |
| 2 | Single 9-module 3×3 bento board (not multi-sheet) | User answer |
| 3 | Loading screen: strip to invocation — sigil + Plumber koan + minimal ENTER | User answer |
| 4 | Koan: **"The mirrors are already inside you. The field reminds you of them."** | User answer |
| 5 | Field label "HARSHITA'S FIELD" → bottom-left (game-style HUD pattern) | User stated |
| 6 | Welcome-back chip → off-center (bottom-left grouping or top-right corner per bento) | User stated |
| 7 | ENTER button: drop `[ ... ]` brackets, hairline Ba Arc gradient underline | Brand-aligned per bento |
| 8 | HUD chip strip → already moved to Satoshi font-sans in previous session | Carried over |
| 9 | Onboarding's bottom-24 chip strip → already removed in previous session | Carried over |
| 10 | codex-gpt-image (Codex OAuth, zero marginal cost) for the library image | User answer |
| 11 | Beacon 3D bakes from `sankalpa/public/depth-reading/images/` (4 views per section) via Meshy `multi-image-to-3d`, geometry-only (`--no-texture`) | User answer |
| 12 | Beacons stored in both `sankalpa/public/depth-reading/meshes/` AND `noesismirror-web-falseearth/public/models/beacons/` | User answer |
| 13 | Unified in-engine BeaconMaterial (NodeMaterial) replaces all GLB materials — handles textured legacy bakes + untextured new bakes uniformly | This spec |

## Bento board structure (9 modules, 3×3 landscape)

```
┌───────────────────┬───────────────────┬───────────────────┐
│ 1. COLOR SPECTRUM │ 2. TYPOGRAPHY     │ 3. THE SIGIL      │
├───────────────────┼───────────────────┼───────────────────┤
│ 4. BUTTONS        │ 5. HUD OVERLAYS   │ 6. MODAL ANATOMY  │
├───────────────────┼───────────────────┼───────────────────┤
│ 7. WORLD UI       │ 8. LOADING SCREEN │ 9. BRAND MARK     │
└───────────────────┴───────────────────┴───────────────────┘
```

Rendered image: `docs/superpowers/specs/2026-06-30-noesis-ui-bento.png` (1536×1024, ~1.6 MB).

The image IS the spec — when implementing the fixes below, refer to it for visual treatment. If a fix detail is ambiguous in text, the image is the source of truth.

## Post-image fix sequence

### A — Chip strip duplication (bento module 5)

**Root cause:** HUD's persistent chip strip at `bottom-6` (HUD.tsx:592-599) renders even while LoadingScreen overlay is visible. LoadingScreen renders its own instructional control row (different labels: `W/A/S/D MOVE · SHIFT RUN · C CAM · LOOK`). Two strips visible simultaneously during the loading phase.

**Fix:** Gate HUD's chip strip on `hasEnteredField` (or equivalent loaded-and-onboarded state). The store likely already tracks this — read from gameStore. Render the strip only when `hasEnteredField === true`.

**Files:** [src/components/HUD.tsx:592-599](src/components/HUD.tsx:592)

**Verification:** Refresh the loading screen → only LoadingScreen's `W/A/S/D MOVE · SHIFT RUN · C CAM · LOOK` row visible. Click ENTER → HUD's `WASD · SHIFT · G · ESC` strip appears.

### B — Field label reposition (bento module 5)

**Current:** HUD.tsx:584-592 renders `{fieldLabel}'S FIELD` at `top-6 left-1/2 -translate-x-1/2` — directly above and overlapping the compass at `top-16 left-1/2`.

**Target per bento module 5:** Bottom-left corner. Same Panchang display font, same opacity (`text-noesis-parchment/30`), same `tracking-[0.5em]`. Reposition to `bottom-6 left-6`.

**Conflict:** FPS counter already lives at `bottom-6 left-6` (HUD.tsx:603-607). Stack them: field label on the upper line, FPS counter below it (or to the right). Or move FPS to top-left of the screen.

**Recommendation:** Field label at `bottom-6 left-6`. FPS counter moved to `top-6 right-6` (matches bottom-right progress chip mirror placement). This frees the bottom-left as the "field identity" zone.

**Files:** [src/components/HUD.tsx:584-607](src/components/HUD.tsx:584)

### C — Welcome-back chip reposition (bento module 5 reference)

**Current:** Onboarding.tsx:208 sets `returningChip` text; rendered centrally (currently overlapping the compass area as seen in screenshot 1).

**Target per bento module 5:** Top-right corner, small Satoshi micro-chip. Match the existing connection-status / progress-chip register at bottom-right but at top-right instead.

**Files:** Onboarding.tsx (find the render site for `returningChip`; the agent's earlier exploration found the set site but the render site is elsewhere in the file — locate and reposition).

### D — ENTER FIELD button restyle (bento module 4)

**Current:** `[ ENTER FIELD ]` literal with brackets, gold-pulse animation, no border/panel, Panchang display.

**Target per bento module 4 (PRIMARY state):**
- Text: `ENTER` (no brackets, no "FIELD" suffix — the next screen IS the field)
- Font: Panchang display, Sacred Gold, generous letter-spacing
- Border: none on the button itself; instead a **single 1px hairline underline** in Ba Arc gradient (Coherence Emerald → Sacred Gold, linear-gradient 90deg)
- Animation: replace `goldPulse` (2.5s) with subtle bioluminescent breath (period 6s, opacity 0.85→1.0) — slower, less insistent
- Hover: underline grows from center to edges over 300ms

**Files:** [src/ui/LoadingScreen.tsx:157-172](src/ui/LoadingScreen.tsx:157) (playButtonStyle) and [src/ui/LoadingScreen.tsx:265-291](src/ui/LoadingScreen.tsx:265) (button JSX — drop "ENTER FIELD" → "ENTER").

### E — Loading screen copy + layout (bento module 8)

**Current:** Three paragraphs centered, sigil at top, button at bottom. Reads as app description.

**Target per bento module 8:**
- Sigil at top (existing, keep `khaBreath 6s` animation)
- Single line of body text, Satoshi, Parchment color, italics, centered: **"The mirrors are already inside you. The field reminds you of them."**
- ENTER button at bottom (per fix D)
- Drop the three paragraphs entirely
- Drop the inline `InstructionRow` control list — replaced by HUD chip strip once user enters

**Files:** [src/ui/LoadingScreen.tsx:227-253](src/ui/LoadingScreen.tsx:227) (delete the 3-paragraph block, replace with single italic koan), [src/ui/LoadingScreen.tsx:293-320](src/ui/LoadingScreen.tsx:293) (delete the InstructionRow block — fix A's chip strip gate replaces this functionally).

### F — Modal anatomy applied to existing dialogs (bento module 6)

**Current:** Pause overlay (HUD.tsx:634-650) and Keyboard help modal (HUD.tsx:652+) use minimal centered text with no panel framing.

**Target per bento module 6:**
- Outer frame: 1px Sacred Gold hairline border around a Deep Surface (#0E1428) panel
- Header bar: full-width strip at top, Panchang display title in Sacred Gold ("PAUSED" / "HELP" / "SETTINGS"), thin Muted Silver underline
- Body area: generous padding, content in Satoshi
- Footer (optional): right-aligned ghost button for "RESUME" / "CLOSE"
- Sacred-geometry corner brackets: small geometric mark in each corner of the frame (Sacred Gold, hairline)
- Scrim: Void Black at 80% opacity (already present)

**Files:** [src/components/HUD.tsx:634-700](src/components/HUD.tsx:634) (pause overlay + keyboard help modal). Future settings modal follows same template.

### G — World UI label pattern (bento module 7)

**No current code change.** Reserve the pattern for future beacon/mirror name labels: floating Satoshi label in world-space, Sacred Gold proximity indicator dot, SF Mono distance value. Document in spec for the next implementer.

Beacons themselves (the 3D objects the labels float above) are covered in Section H below.

### H — Beacon 3D mesh integration (bento module 7 entities)

**Context:** The 16 "depth-reading" sections each have a brand-aligned sacred-geometry artifact rendered by Meshy AI from a 4-view source image set. These become the in-world beacons that the player walks toward (the current `Beacon.tsx` renders only a shader shell — no actual geometry).

**Bake inventory (18 GLBs total in both projects):**

| Set | Files | Origin | Material state |
|---|---|---|---|
| Pre-existing | `cover`, `cover-alt-1`, `cover-alt-2`, `part-1` through `part-4` | Prior bake, PBR-textured | Have embedded materials (will be overridden) |
| New this session | `witness-layer`, `compendium`, `part-5` through `part-11`, `closing`, `quine` | Multi-image-to-3D geometry-only via Meshy skill | No materials, neutral clay surface |

**Locations (both populated, identical files):**
- `sankalpa/public/depth-reading/meshes/{section-id}.glb` — original sankalpa pipeline destination per its README
- `noesismirror-web-falseearth/public/models/beacons/{section-id}.glb` — FalseEarth scene integration target

**Total weight:** 199 MB across 18 files. Four heaviest: `closing` (24 MB), `compendium` (29 MB), `part-5` (31 MB), `part-11` (20 MB). Acceptable for dev, must be optimized pre-deploy (separate optimization spec).

**Bake parameters used (for reproducibility):**
- `meshy multi-image-to-3d` with 4 views (front/back/left/right) per section
- `--model meshy-6 --no-texture --polycount 8000 --topology quad`
- ~20 credits per bake = ~220 credits total spend across 11 new bakes

#### H.1 — Unified BeaconMaterial (NodeMaterial, new)

**Problem:** 7 GLBs have embedded brass/metal PBR materials from the prior bake; 11 have no materials at all. Loading as-is produces a visually disjointed set across 18 beacons.

**Solution:** Single shader-driven `BeaconMaterial` that traverses every mesh in any loaded beacon GLB and replaces its material with a brand-aligned NodeMaterial. Same pattern as the Plumber's `useExternalMaterials = false` path in `useCharacterAssets.ts`.

**Material composition:**
- **Base color:** Brass patina — warm dark base (`#2A1F0E`-ish derived from Sacred Gold mixed with Void Black)
- **Sacred Gold seam lines:** Procedural — derive from mesh UVs or position-based noise to pick out edge geometry in Sacred Gold (`#C5A017`) hairline
- **Coherence Emerald bioluminescent core:** Emissive `#10B5A7` masked by distance-from-mesh-center (fades outward — strongest at the geometric center, fades to 0 at silhouette edges)
- **Per-state emissive intensity multiplier:** Driven by `EMISSIVE_INTENSITY` const already in `Beacon.tsx:27-31` (dormant 0.2, approachable 0.5, active 0.9)
- **Breath pulse:** Sine on `uTime`, period 6s — same rhythm as the character aura's pulse for visual coherence
- **Optional metalness map preserved** from legacy textured GLBs (the brass texture stays useful) — but albedo and emissive are forced to our values

**New file:** `src/components/beacon/BeaconMaterial.ts` — exports a `makeBeaconMaterial(state)` factory or a `useBeaconMaterial(state)` hook.

#### H.2 — Beacon.tsx integration

Wire the GLB load + material override into existing `Beacon.tsx`:

1. Add `useGLTF(\`/models/beacons/\${section.id}.glb\`)` inside the component (or accept the loaded mesh as a prop from a parent loader to deduplicate).
2. After load, traverse the cloned scene with `SkeletonUtils.clone` (consistent with character pattern) and replace every `THREE.Mesh.material` via `makeBeaconMaterial(currentState)`.
3. Drive the material's state uniform from the existing state machine (`dormant | approachable | active`) so the emissive intensity transitions match `EMISSIVE_INTENSITY` lerp behavior.
4. Keep the existing shader AOE shell (mentioned at `Beacon.tsx:55+` per the file header comment) as the outer "you are near" indicator — the GLB sits inside that shell.
5. Render order: shell first (additive blend), then the GLB mesh (depth-tested). User walks up, sees shell glow at distance, sees the artifact at close range.

**Files:**
- NEW: `src/components/beacon/BeaconMaterial.ts`
- EDIT: [src/components/Beacon.tsx](src/components/Beacon.tsx) — add GLB load + material override + lerp state into the new material

#### H.3 — Beacon spawn / per-section assignment

The world data layer (likely `world.json` from the API or a static config) needs to map each beacon entity to its `section.id` so `Beacon.tsx` knows which GLB to load. Two paths:

- **A. The data already has section IDs** — verify by reading the world config + the existing Beacon props. Wire `section.id` → GLB path.
- **B. Manual assignment for the demo** — hard-code a beacon-to-section mapping in `BeaconGarden.tsx` (the spawner) for the first 16 beacons, deferring data-layer integration.

Implementation decides which path is real after reading `BeaconGarden.tsx`.

#### H.4 — Cover variant selection

3 cover GLBs exist: `cover.glb`, `cover-alt-1.glb`, `cover-alt-2.glb`. The active section assigned to "cover" id must pick one. Default to `cover.glb`; user can switch by renaming or via a config constant. Out of scope to design this picker UI now.

#### H.5 — Size optimization (deferred, separate spec)

Four GLBs over 20 MB will not ship to production unchanged. Future spec covers:
- `gltf-transform decimate --simplify` to reduce polycount on the four large ones
- `gltf-transform meshopt` for Draco/Meshopt compression
- Re-bake at lower `--polycount` if simplification artifacts unacceptable
- Possibly convert any retained textures to KTX2 + Basis Universal (matches existing astronaut texture pipeline)
- Expected outcome: 199 MB → ~60-80 MB total set (~60% reduction)

**Files for the optimization pass (not this spec):** any GLB > 20 MB.

## What's intentionally NOT in this spec (out of scope)

- The Plumber avatar bake itself (done in prior session, separate spec)
- The shader-driven character aura (done in prior session)
- Beacon AOE shaders (already shipped; this spec adds a GLB INSIDE the shell, doesn't replace the shell)
- Audio / haptics / motion polish
- Mobile-specific layout deviations (the bento is desktop-first; mobile follows once desktop is locked)
- Full settings modal feature set (this spec defines anatomy only; the actual settings controls are a separate feature spec)
- GLB size optimization pass (Section H.5 references it — own spec when ready)
- Re-baking the 5 pre-existing PBR-textured beacons as geometry-only for material uniformity (BeaconMaterial overrides both, so it's not strictly required)
- Sankalpa project integration (this spec is FalseEarth-scoped; sankalpa simply receives the same GLB files as a byproduct of Decision 12)

## Verification

1. Open the rendered bento at `docs/superpowers/specs/2026-06-30-noesis-ui-bento.png` and use as visual reference throughout implementation.
2. After all fixes A-F applied: refresh the dev server.
3. Loading screen: only the sigil + koan + ENTER button visible. No paragraph soup. No bracketed button.
4. Click ENTER → field appears. HUD chip strip appears at bottom-center for the first time (was hidden before). Compass at top-center. Field label "HARSHITA'S FIELD" at bottom-left. Welcome-back chip (if applicable) at top-right.
5. Press P → pause modal appears with sacred-geometry frame (per bento module 6). Press H → help modal same treatment.
6. **Beacons (Section H):** Walk toward a beacon — the existing AOE shell appears at distance (unchanged), then the GLB artifact resolves at close range, painted in brass + Sacred Gold seams + Coherence Emerald bioluminescent core. State transitions (dormant → approachable → active) drive a smooth emissive lerp, NOT a hard color flip.
7. Verify visually that all 16 beacon types look like one consistent design family — no disjointed brass-textured-vs-grey-clay split between old and new bakes (the unified BeaconMaterial enforces this).
8. `npm run typecheck` clean. `npm run build` clean.
9. Visual diff against the bento image: each module should map to a visible UI region in the running app.

## Open items requiring user input before implementation begins

- **Beacon → section ID mapping:** does `world.json` / the existing beacon config already carry `section.id`, or do we need a manual mapping in `BeaconGarden.tsx`? Decided during implementation by reading the spawner.
- **Cover variant pick:** `cover.glb` is the default; `cover-alt-1.glb` and `cover-alt-2.glb` exist but are not assigned. Confirm before wiring or leave as default + ignore the alts.

All other scope questions answered in the brainstorm.
