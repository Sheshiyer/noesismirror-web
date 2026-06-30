# Releases — FalseEarth

## Version → Muse Mapping (0.1.x cycle)

Tryambakam Noesis FalseEarth releases in the 0.1.x range are named after the **nine Muses of Hesiod**, in canonical order. The chosen Muse reflects the dominant register of that release.

| Version | Muse | Greek | Domain | Brand resonance |
|---|---|---|---|---|
| 0.1.1 | **Calliope** | Καλλιόπη | Epic poetry, chief of the Muses | First major release — the epic of the FalseEarth |
| 0.1.2 | Clio | Κλειώ | History | Session / visit history surfaces |
| 0.1.3 | Erato | Ἐρατώ | Love poetry, mimicry | Relational / sigil features |
| 0.1.4 | Euterpe | Εὐτέρπη | Music | Audio system features |
| 0.1.5 | Melpomene | Μελπομένη | Tragedy | Shadow content / dark register |
| 0.1.6 | Polyhymnia | Πολυύμνια | Sacred poetry, hymns | Ritual / chant features |
| 0.1.7 | Terpsichore | Τερψιχόρη | Dance | Character animation expansion |
| 0.1.8 | Thalia | Θάλεια | Comedy, blooming | Rose / garden expansion |
| 0.1.9 | Urania | Οὐρανία | Astronomy | Starfield / cosmic features |

> Mapping for 0.2.x onward TBD — candidates include the 12 Olympians, the 3 Charites, or the brand's own Kha-Ba-La triad cycling through majors.

---

## 0.1.1 — Calliope · 2026-06-30

> *"What walks here is older than knowing."* — The epic begins.

The first major release. Establishes the FalseEarth as a brand-aligned Tryambakam Noesis surface: a single anonymous Plumber (male and female) walks a meditative grass-rose field, approaches 16 sacred-geometry beacons whose color register shifts the world's tint, against a complete UI overhaul rebuilt to the brand's Goethe-colored, sacred-geometry, bioluminescent vocabulary.

### Character — The Plumber

- **Male Plumber avatar** baked via Meshy AI: gpt-image-2 concept → image-to-image edit (satchel removal) → image-to-3D → auto-rigging → 4 animations (Idle / Walk / Run / WalkingBack). 5 GLBs at `public/models/avatar/`.
- **Female Plumber sibling-twin** baked from a mirrored prompt — same hat-shadowed face, same compass, same emerald pendant, female-coded body with hair flowing under the hat. 5 GLBs at `public/models/avatar-female/`.
- **Hybrid gender switch**: `WorldConfig.gender` field auto-derives from the depth-reading report; `gameStore.genderPreference` (Auto / Male / Female) overrides; persisted via Settings drawer.
- **Astronaut preserved as instant fallback** behind the `AVATAR_PROFILE_FORCE` escape hatch.
- **Shader-driven Coherence-Emerald aura** replacing the old flat cyan disc — TSL node-material plane with torus-field radial profile, breath pulse, rotational flow.

### Beacons — Sacred geometry, 16 sections

- **18 Meshy-baked beacon GLBs** (11 newly baked from sankalpa's 4-view source images using multi-image-to-3D geometry-only; 7 pre-existing PBR bakes preserved). Stored in both `sankalpa/public/depth-reading/meshes/` and `noesismirror-web-falseearth/public/models/beacons/`.
- **Unified `BeaconMaterial`** (TSL NodeMaterial) replaces every GLB's embedded material with brass base + Coherence-Emerald bioluminescent core + breath pulse + state-driven emissive lerp (dormant 0.2 → approachable 0.5 → active 0.9).
- **Per-section emissive color** mapped by archetype meaning across the 4 brand spectrum tones — 5 Sacred Gold, 4 Witness Violet, 3 Flow Indigo, 4 Coherence Emerald.
- **Levitation above grass canopy** — beacons hover at 1.6 m with ±15 cm bob, visible above the 0.8 m grass max from any approach angle.

### Proximity-driven world tint

- **`currentBeaconColorHex` + `currentBeaconHueShift`** in gameStore — closest in-range beacon drives a global tint.
- **Rose petals** lerp `uHueShift` toward the beacon's hue delta (200 ms tau).
- **CosmicBeams** lerp `uGlowColor` toward the beacon's hex (250 ms tau).
- Walk back to neutral ground → both fade to defaults (rose: natural pink; beam: Coherence Emerald).
- Shared `sectionColors.ts` module is the single source of truth across BeaconArtifact, BeaconGarden, Rose, and CosmicBeams.

### UI overhaul — bento-driven

A 9-module Figma-style design library bento board was generated via codex-gpt-image (gpt-image-2, zero marginal cost) grounded in the Tryambakam Noesis brand vault. Saved at `docs/superpowers/specs/2026-06-30-noesis-ui-bento.png`. All UI surfaces fit to it:

- **Loading screen** distilled to sigil + single italic koan ("*The mirrors are already inside you. The field reminds you of them.*") + minimal "ENTER" button with hairline Ba Arc (emerald→gold) gradient underline. Three paragraphs and inline `InstructionRow` controls removed.
- **Pause + Help modals** wrapped in new `NoesisModalFrame` — Sacred-Gold corner brackets, Deep-Surface body, Panchang header bar, Muted-Silver hairline divider, footer footnote.
- **Settings drawer** brand-framed (corner brackets, Deep-Surface, Panchang header) with new **Profile** section exposing the gender toggle as first-class UI.
- **HUD chip strip** moved to Satoshi (`font-sans`) per brand — mono is reserved for biometric data.
- **Field label** (`HARSHITA'S FIELD`) moved to bottom-left (was top-center colliding with compass).
- **FPS counter** moved to top-right (frees bottom-left for field label).
- **Welcome-back chip** moved to top-right corner (was center-blocking).
- **Onboarding chip strip removed** (HUD's persistent strip is the single source of truth).
- **HUD chip strip gated on `isGameStarted`** so it no longer leaks through the LoadingScreen overlay.

### Brand alignment

- **Typography:** Panchang display + Satoshi body + SF Mono biometric — per [`brand-docs-final/tryambakam-noesis-aleph/06-visual-identity.md`](file:///Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/brand-docs-final/tryambakam-noesis-aleph/06-visual-identity.md).
- **Goethe color spectrum:** Void Black + Witness Violet + Flow Indigo + Sacred Gold + Coherence Emerald — used throughout, no off-spectrum colors.
- **Bioluminescent principle:** light originates from within the figure (resonance pendant glow, beacon emissive), never projected onto.
- **No mystical clichés** — no third eye, no lotus literalism, no chakra rainbow, no warm cozy lighting.
- **HorizonHalo unmounted** — the 86–94 m global emerald ring was reading as a hard world-boundary line; starfield + grass falloff carry the horizon mood without it.

### Dev tooling

- **Leva visible by default** (was `initialHidden={true}`). Hidden during LoadingScreen so it doesn't leak. Press `h` to toggle.
- **Game.Avatar** Leva panel — Gender toggle (Auto/Male/Female).
- **Game.Tint** Leva panel — Force tint override (Auto / Gold / Violet / Indigo / Emerald / None) for previewing the proximity-tint behavior without walking.
- **Game.Dev** Leva panel — `📊 GPU/CPU Perf` toggle (r3f-perf), `🔍 Beacon labels` toggle (3D HTML overlay showing each beacon's resolved section id + color hex), respawn hint.
- **`R` key** — respawn to world origin.
- **eruda console** still gated on `?debug=true`.

### Reusable infrastructure (out-of-tree)

- **Meshy AI skill** at `~/.claude/skills/Meshy/` — full Bun CLI wrapping every `/openapi/v1` endpoint (text-to-3d, image-to-3d, multi-image-to-3d, auto-rigging, animation library, remesh, retexture, balance, text-to-image, image-to-image, poll, download, **bake-avatar**, **bake-from-prompt**). Workflows: BakeAvatar, Generate3D, RigAndAnimate, PostProcess. Accumulated Gotchas: balance-endpoint field-name drift, image-to-image `reference_image_urls` field, Meshy-6 needs `should_remesh: true` for the 300 k face rigging limit.

### Documentation

- `docs/superpowers/specs/2026-06-30-noesis-ui-overhaul-design.md` — full design spec for the UI overhaul + beacon integration (Sections A through H).
- `docs/superpowers/specs/2026-06-30-noesis-ui-bento.png` — the 9-module visual north-star (gpt-image-2 generated).
- `docs/superpowers/specs/2026-06-30-meshy-avatar-swap-design.md` — earlier spec for the Plumber bake pipeline.

### Stats

- **40+ files changed**, ~6 800 net lines added (mostly assets + spec docs)
- **220 + new GLBs** committed (~470 MB total assets — optimization pass deferred to a later release)
- **Meshy credits spent (this release):** ~625 (~$13) — concept generations + 1 male + 1 female bake + 11 beacon bakes
- **All gates clean:** 20/20 tests pass, typecheck zero errors, build succeeds
