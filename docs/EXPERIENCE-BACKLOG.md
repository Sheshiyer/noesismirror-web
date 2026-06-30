# TRYAMBAKAM NOESIS — Experience Backlog

Per-touchpoint catalogue of UI/UX/feature work that builds on the Wave A/B/C foundation.
**Scope rule:** every item must improve UI, UX, or feature surface. No tests, no e2e harnesses, no infra refactors — those live elsewhere.

**Status legend:**
`P0` ship-now (next 1–2 commits) · `P1` next pass · `P2` after first user feedback · `P3` future polish

**ID convention:** `TPn-NNN` — `n` is touchpoint number, `NNN` is item index.

---

## TP1 — Home / Intro Page (`src/components/Home.tsx`)

**Shipped (Wave C):** Void-Black + 40px constellation grid backdrop + Witness-Violet center glow; Panchang gold title; mono uppercase subtitle/buttons; auth/grants/flash logic preserved.

| ID | Item | Priority |
|---|---|---|
| TP1-001 | Slow drift on constellation grid (3–5px translate, 8s loop) — substrate feels alive, not static | P1 |
| TP1-002 | Staggered character reveal of `TRYAMBAKAM NOESIS` on first load (50ms per letter, opacity + 4px upward slide) | P1 |
| TP1-003 | Cursor-parallax: Witness-Violet glow center follows pointer with 200ms ease and ±8px radius | P1 |
| TP1-004 | Brand sigil responds to hover — opacity 0.9 → 1.0, scale 1.0 → 1.05 (no auto-rotation; brand: anti-spin) | P1 |
| TP1-005 | Coherence-Emerald breath pulse on sigil synced to 4-7-8 inhale/hold/exhale cycle (`@keyframes scale 1 → 1.03 → 1`) | P1 |
| TP1-006 | Coherence-Emerald underline grows under subtitle over 1.5s on mount (`width 0 → 60%`) | P1 |
| TP1-007 | Sigil loader: SVG path `pathLength` animates 0 → 1 while `isLoading` so the mark *draws itself* | P0 |
| TP1-008 | Top-right session chip: `font-mono` showing logged-in email + `[ sign out ]` link in Sacred Gold | P0 |
| TP1-009 | Empty-state copy: replace `Your account has no granted readings` with `No fields are currently inscribed to your name` | P0 |
| TP1-010 | Empty-state CTA: replace `[ ENTER DASHBOARD ]` (broken — no dashboard exists) with `[ REQUEST ACCESS ]` → `mailto:` link | P0 |
| TP1-011 | Grant chip prefix: `◆ HARSHITA` instead of `[ ENTER FIELD — HARSHITA ]` (sigil glyph, brand-aligned) | P1 |
| TP1-012 | Hover preview on grant chip — render mini constellation map of that field's beacons in a popover | P2 |
| TP1-013 | Grant fingerprint: hover chip → tiny mono chip strip `2 audio · 1 video · 3 reading · 4 study` | P2 |
| TP1-014 | Last-visited timestamp on each grant chip (read from `localStorage.noesis_visit_<personId>`) | P1 |
| TP1-015 | "New since last visit" indicator: gold dot on grant chips when manifest mtime > last visit | P2 |
| TP1-016 | Keyboard navigation: arrow keys cycle grant chips, Enter activates the focused one | P0 |
| TP1-017 | Focus rings: `focus-visible:ring-2 ring-noesis-gold/60 ring-offset-2 ring-offset-noesis-void` on all interactive elements | P0 |
| TP1-018 | Description copy stanza spacing: 2× line-height between the three paragraphs (breathing) | P0 |
| TP1-019 | Rotating subtitle: cycle through 4 taglines on tab visibility regain — `Self-Consciousness as Technology`, `A field of mirrors`, `Proximity is the only interface`, `Distance becomes inquiry` | P2 |
| TP1-020 | Grant count contextual copy: `1 field inscribed` vs `3 fields available` (not the count alone) | P0 |
| TP1-021 | Error state distinction: surface error TYPE (network / 401 / 500) with brand-appropriate copy per case | P1 |
| TP1-022 | Auto-retry on network error with exponential backoff (1s, 2s, 4s) before showing error UI | P1 |
| TP1-023 | Page `<title>` reflects current state: `Tryambakam Noesis · Sign In` vs `Tryambakam Noesis · 3 Fields` | P0 |
| TP1-024 | `<link rel="preload">` for Panchang + Satoshi font subsets to cut LCP | P1 |
| TP1-025 | `prefers-reduced-motion` honored: kill grid drift, breath pulse, parallax | P0 |
| TP1-026 | First-load: hide controls hint strip until after auth state resolved (no flicker) | P0 |
| TP1-027 | Mobile breakpoint: title scales to 3xl, brand sigil scales to 16x16, button takes full width with padded gutters | P1 |
| TP1-028 | Sign-out keyboard shortcut: `Shift+Q` from intro | P2 |
| TP1-029 | Persistent "recent fields" section (top 3 by last-visited) above the alphabetical grant list | P2 |
| TP1-030 | Document `description` meta + Open Graph card so shared links render with brand sigil | P1 |

---

## TP2 — World Scene / 3D Environment (`src/app/App.tsx`, `WorldController`, `background/*`)

**Shipped (Wave C):** Starmap intensity 0.55, Deep-Surface ambient light added.

| ID | Item | Priority |
|---|---|---|
| TP2-001 | Coherence-Emerald horizon halo — wide radial gradient at world edge for cosmic-warmth | P1 |
| TP2-002 | Grass color shift: desaturate from bright blue to dim parchment with emerald speckle (brand palette) | P1 |
| TP2-003 | Knee-height drifting fog (0.5–1m), Witness-Violet tint, density 0.03 — adds spatial layering | P1 |
| TP2-004 | Subtle terrain elevation: rolling 0–2m hills via existing height-field shader (less flat) | P1 |
| TP2-005 | "North star" — single Sacred-Gold point in sky above spawn, visible from anywhere, orientation anchor | P0 |
| TP2-006 | Spawn marker: Sacred-Gold ring on ground at (0,0,0), 1.5m radius, persistent through session | P0 |
| TP2-007 | Character emerald shadow — replace default black with Coherence-Emerald (bioluminescent presence) | P1 |
| TP2-008 | Character motes — tiny Sacred-Gold particles orbiting character at 1m radius, 0.3rad/s (presence trail) | P2 |
| TP2-009 | Distance fog: linear Void-Black tint starting at 80 units, full opacity at 120 units (depth + perf) | P1 |
| TP2-010 | Wind direction: consistent global vector affects grass tilt + fog drift | P2 |
| TP2-011 | Cosmic dust: slow-falling Coherence-Emerald micro-particles (snow analog), reduced-motion safe | P2 |
| TP2-012 | Field boundary fade — beyond 90 units the ground fades to void (no walls; soft horizon) | P1 |
| TP2-013 | Tone-mapping swap: Reinhard → ACES Filmic for richer Sacred-Gold highlights | P1 |
| TP2-014 | Bloom threshold tuned to favour Sacred Gold (so beacon glows pop without washing the scene) | P1 |
| TP2-015 | Replace astronaut model with sigil-torso abstract figure (no helmet — brand: not spacesuit kitsch) | P2 |
| TP2-016 | Reflection probe near spawn: small mirror disc reflecting sky (`MeshReflectorMaterial` with low resolution) | P2 |
| TP2-017 | Lightning flash: every 20–40s a Sacred-Gold lens flare across the sky (anti-mystical, very subtle) | P3 |
| TP2-018 | Day/night cycle on 5-min loop — Void Black ↔ Deep Surface ramp; affects ambient & fog | P3 |
| TP2-019 | Sacred-Gold sun/moon disc arcs across the sky over the cycle | P3 |
| TP2-020 | Footprints: small depression decals where character has walked, decay over 30s | P3 |
| TP2-021 | Quality menu: `Q` cycles low/med/high — gates bloom, DoF, particle count, draw distance | P1 |
| TP2-022 | FPS counter toggle (`F`) in font-mono lower-right | P1 |
| TP2-023 | Grass LOD: full density within 20 units, sparse beyond, hidden past 60 (perf) | P1 |
| TP2-024 | Slow nebula UV drift on starmap (0.005 rad/s) instead of static | P2 |
| TP2-025 | Pause on tab hidden: throttle RAF when document not visible (battery) | P0 |
| TP2-026 | Camera shake on beam:hit (very subtle, 50ms) for tactile feedback | P2 |
| TP2-027 | Anti-aliasing: SMAA on high quality, FXAA on medium, none on low | P1 |
| TP2-028 | Character footstep particles: small puff per step (frequency by speed) | P2 |
| TP2-029 | Audio-reactive starmap: subtle UV warp on bass frequencies of ambient track | P3 |
| TP2-030 | Procedural cloud layer at 50m altitude — wispy, low density, Witness-Violet | P3 |

---

## TP3 — Beacon (in-world object) (`src/components/Beacon.tsx`)

**Shipped (Wave C):** Floating HTML label fades by distance (invisible ≥8u, full at ≤6u).

| ID | Item | Priority |
|---|---|---|
| TP3-001 | Type-specific beacon geometry — audio: oscillating sphere; video: flat film panel; reading: open book; slides: stacked plates; study: node-graph cluster | P1 |
| TP3-002 | Beacon emissive intensity ramp: dormant 0.2 → approachable 0.5 → active 0.9 (already in plan, wire it) | P0 |
| TP3-003 | Visited state visual: gold ring around base (replacing/joining the cyan), persists per `gameStore.visitedBeaconIds` | P0 |
| TP3-004 | Beacon "settled" rotation when standing in active radius >3s — gentle rotation + tonal pulse | P1 |
| TP3-005 | Beacon "interest" — raycast from camera highlights beacon at distance even when out of approach radius | P2 |
| TP3-006 | Suspended position — beacons hover 0.3m above ground (anti-gravity, brand: not earthbound) | P1 |
| TP3-007 | Ground shadow: Coherence-Emerald circle that pulses with 4-7-8 breath ratio | P1 |
| TP3-008 | Approach SFX: soft "whoosh" one-shot on enter APPROACH (uses gameStore audio bus, respects duck) | P1 |
| TP3-009 | Visited trail: faint Sacred-Gold dotted line on ground from character to visited beacon on re-approach | P2 |
| TP3-010 | Recursive inner sigil — small mirror geometry rotates inside main beacon (brand: "recursive") | P2 |
| TP3-011 | Bioluminescent emerald particles rise from active beacons (5–10 particles/s) | P2 |
| TP3-012 | Proximity scaling: 1.0 at far → 1.15 at active (drawing-in feel) | P1 |
| TP3-013 | LookAt character on every frame — beacon faces you, encounter is character-centric | P1 |
| TP3-014 | Anchor line: when active, faint Sacred-Gold line from beacon to character (tethering motif) | P2 |
| TP3-015 | Floating label font: switch from mono to Panchang display per brand | P0 |
| TP3-016 | Label positioning: offset upward 0.5m + slight forward (avoid beacon body collision) | P0 |
| TP3-017 | Label backdrop: `bg-noesis-void/60 backdrop-blur-sm` (not opaque) | P0 |
| TP3-018 | Label asset-type chip + `i` glyph; dwell on glyph reveals summary | P1 |
| TP3-019 | Beacon "breath" — scale 1.0 → 1.03 → 1.0 on 4-7-8 cycle (active state only) | P1 |
| TP3-020 | State transitions: 200ms ease for color/intensity changes (no snap) | P0 |
| TP3-021 | `visitedBeaconIds` persistence: `localStorage.noesis_visited_<personId>` (Set serialized) | P0 |
| TP3-022 | Completion ring: when all beacons visited, Sacred-Gold horizon ring appears at world edge | P2 |
| TP3-023 | Mouse click on beacon (raycast) opens its viewer — accessibility alt to G key | P1 |
| TP3-024 | Per-session shuffle: golden-angle starting offset randomized so layout differs each session (re-discovery feel) | P2 |
| TP3-025 | Beacon collision: gentle repulsion as character approaches (no walking through) | P1 |
| TP3-026 | Tab cycles through ALL beacons (currently only adjacent via arrow keys) | P1 |
| TP3-027 | Beacon-distant ground halo: very faint Sacred-Gold disc on ground 5m below each beacon for orientation when far | P2 |
| TP3-028 | Render beacons in separate transparent pass so they pop above fog/distance haze | P2 |
| TP3-029 | Visited beacons emit a lower-intensity ambient drone vs unvisited (less "calling") — paired with TP6-017 | P2 |
| TP3-030 | Beacon "calm" mode — if user idles >60s near a beacon, glow softens to indicate "no pressure" | P3 |

---

## TP4 — AssetViewer + Per-Type Renderers (`src/components/AssetViewer.tsx`, `assetRenderers/renderers.tsx`)

**Shipped (Wave C):** Void-Black + Sacred-Gold border modal with constellation grid backdrop; Panchang title + `[ ESC | G ]` hint; all 5 renderers use `buildAssetUrl`; lifecycle wired to `setModalOpen`.

| ID | Item | Priority |
|---|---|---|
| TP4-001 | Iris reveal — backdrop fades 200ms, panel scales 0.98 → 1.0 over 400ms ease-out | P1 |
| TP4-002 | Close animation mirrors open in reverse | P1 |
| TP4-003 | Thin Sacred-Gold playback progress bar at top of panel for video/audio (live updates) | P1 |
| TP4-004 | Replace native `<video controls>` with custom controls: Sacred-Gold play/pause, Coherence-Emerald scrub | P1 |
| TP4-005 | Custom audio waveform via Web Audio `AnalyserNode` — Coherence-Emerald bars | P2 |
| TP4-006 | Picture-in-picture button on video viewer (uses PiP API) | P2 |
| TP4-007 | Fullscreen button on video viewer (uses Fullscreen API) | P2 |
| TP4-008 | Keyboard shortcuts in viewer: Space play/pause, ←/→ ±10s seek, ↑/↓ ±10% volume | P0 |
| TP4-009 | Read-time estimate for `.md` files (`Math.ceil(wordCount / 220)` in font-mono) | P1 |
| TP4-010 | Reading scroll progress saved to `gameStore.readProgress[beaconId]`, restored on revisit | P1 |
| TP4-011 | Bookmark — `B` key adds bookmark at current scroll/timestamp; chip in viewer header | P2 |
| TP4-012 | Highlight — select text in ReadingViewer → small popup → persists in localStorage | P2 |
| TP4-013 | Notes — `N` opens a side drawer for text annotations | P2 |
| TP4-014 | Mind-map JSON: install `react-json-tree` or render as interactive D3 tree (collapsible nodes) | P2 |
| TP4-015 | Slides PDF: page navigation chips (1/N) in Sacred Gold below the embed | P1 |
| TP4-016 | Slides keyboard: PageUp/Down + arrow keys navigate pages | P1 |
| TP4-017 | Slide thumbnail strip (right side, ~80px wide) for quick jump | P2 |
| TP4-018 | Install `marked` + `prismjs` for proper markdown headings and code highlighting | P1 |
| TP4-019 | Text-size control: `+`/`-` keys cycle S/M/L | P1 |
| TP4-020 | Line-length toggle: narrow / comfortable / wide (60ch / 80ch / 100ch) | P2 |
| TP4-021 | Focus mode: `Z` key fades non-current paragraph to 40% opacity in ReadingViewer | P3 |
| TP4-022 | "Scene audio dimmed" indicator in viewer header when modalOpen is true | P1 |
| TP4-023 | Poster image for video viewer (backend extracts first frame on upload; viewer references) | P2 |
| TP4-024 | Metadata footer: generation date, duration, file size (from manifest) in font-mono | P1 |
| TP4-025 | Share button: copy deep-link `/p/{personId}#beacon={beaconId}` to clipboard | P1 |
| TP4-026 | Download button: explicit Sacred-Gold download glyph (uses `buildAssetUrl` with `attachment` Content-Disposition) | P1 |
| TP4-027 | Visit history footer: `You visited this 3 days ago` | P2 |
| TP4-028 | Rating: 1–5 emerald-dot scale stored per beacon per user | P3 |
| TP4-029 | Notes endpoint: POST to `/api/beacons/:id/notes` (backend route to be added) | P3 |
| TP4-030 | "Next beacon" suggestion at end of asset — "after this: study guide" with chip to jump | P2 |
| TP4-031 | Minimize modal: pressing `_` shrinks viewer to corner chip, audio/video keeps playing while walking field | P3 |
| TP4-032 | Captions/subtitles support for video (sidecar `.vtt` files) | P2 |
| TP4-033 | Loading state for renderers — Sacred-Gold pulsing sigil while asset fetches | P0 |
| TP4-034 | Error state for renderers — clear failure message, "retry" button, fallback download link | P0 |
| TP4-035 | Modal aria — `aria-describedby` linking summary text for screen readers | P1 |

---

## TP5 — Discovery Panel / Proximity Prompt (`src/components/DiscoveryPanel.tsx`)

**Shipped (Wave C):** Centered overlay, two states (dim approachable / active full), pulsing `[ G ]` glyph, Coherence-Emerald progress bar APPROACH→ACTIVE.

| ID | Item | Priority |
|---|---|---|
| TP5-001 | Approach state: slide up 20px + fade in over 200ms (currently snaps) | P0 |
| TP5-002 | Active state: scale 0.95 → 1.0 + brief Sacred-Gold bloom flash on transition | P1 |
| TP5-003 | After 2s active without action, fade summary text to 50% — keep `[ G ]` glyph in focus | P1 |
| TP5-004 | Type chip background tint per type — audio: emerald, video: gold, reading: parchment, slides: violet, study: indigo | P1 |
| TP5-005 | Asset type icon (SVG) next to the type chip | P0 |
| TP5-006 | Distance readout in font-mono: `3.2m` below the progress bar | P0 |
| TP5-007 | Beacon order indicator: `2 · 10` when >1 beacon (mono, faint) | P0 |
| TP5-008 | Visited dot: small Sacred-Gold dot in top-right of panel if visited | P0 |
| TP5-009 | Estimated content length: `4m read` / `12m audio` / `6 pages` (from manifest metadata) | P1 |
| TP5-010 | Adjacent-beacon pips: small Sacred-Gold dots on left/right panel edges hinting at nearby beacons | P2 |
| TP5-011 | Approach SFX layer — entry tone (low fundamental + 5th) on approachable state | P1 |
| TP5-012 | Active SFX layer — added 3rd above approach tone (richer triad) | P1 |
| TP5-013 | `Backspace` reverses to dormant (explicit "back away" affordance) | P2 |
| TP5-014 | Hover on panel (when active) brightens `[ G ]` glyph to 110% intensity | P0 |
| TP5-015 | Mouse click on panel opens viewer (alt to G key) — full-area click target | P0 |
| TP5-016 | Preview thumbnail in panel: first video frame / waveform / first paragraph (right side, 96x54) | P2 |
| TP5-017 | `[ G ]` glyph character-morph animation between Panchang G variants | P3 |
| TP5-018 | Caption rotates by type: `press G to listen` / `press G to read` / `press G to watch` / `press G to study` | P0 |
| TP5-019 | Tooltip on `[ G ]`: "Press G or Enter — remap in settings" | P1 |
| TP5-020 | Next-beacon arrow: small arrow at panel edge pointing to nearest unvisited beacon | P2 |
| TP5-021 | Mini topographic: dot for character + dot for this beacon in a small frame | P3 |
| TP5-022 | Field coherence reading: faint mono number (placeholder metric for now) | P3 |
| TP5-023 | Viewport responsiveness: full-width on mobile, max 480px on desktop | P0 |
| TP5-024 | `prefers-reduced-motion`: kill pulse + scale, opacity-only transitions | P0 |
| TP5-025 | `aria-live="polite"` announces "approaching Briefing Report" to screen readers | P1 |
| TP5-026 | Focus shift on active state to the panel container (non-visual) | P1 |
| TP5-027 | Panel never blocks character movement input — `pointer-events-none` outer, `pointer-events-auto` inner | P0 |
| TP5-028 | Settle: when character idles in active radius >5s without pressing G, gentle reminder pulse on glyph | P2 |
| TP5-029 | Persist last-shown beacon across navigation (so re-entering the active radius doesn't re-animate from scratch) | P2 |
| TP5-030 | Brand "do not announce" enforcement: if user has visited 3+ beacons, hide the "press G to enter" caption — they know | P2 |

---

## TP6 — Audio System (`src/components/cosmic/BeamAudio.tsx`, new ambient layer)

**Shipped (Wave B):** `gameStore.duckAudio`, BeamAudio respects duck, modal lifecycle ducks to 15%.

| ID | Item | Priority |
|---|---|---|
| TP6-001 | Atmospheric ambient drone — low C-minor loop, ~30s, gain 0.08, begins on first user gesture | P0 |
| TP6-002 | Browser autoplay gate: "click to enable sound" subtle overlay on first world load | P0 |
| TP6-003 | Per-beacon-type positional drones — audio: warmer; video: brighter; reading: thinner; slides: harmonic; study: contemplative | P1 |
| TP6-004 | Drone gain rises with proximity (lerp 0 at 30u → 0.15 at 6u) | P1 |
| TP6-005 | All beacon drones share an output bus that respects `duckAudio` | P0 |
| TP6-006 | Open-viewer SFX: 3-note Coherence-Emerald arpeggio (root, 5th, octave) | P1 |
| TP6-007 | Close-viewer SFX: descending 2-note resolution | P1 |
| TP6-008 | Beacon-visited SFX: gentle "settled" tone on first visit only | P1 |
| TP6-009 | Footstep SFX: subtle grass footsteps (frequency by walk speed) | P2 |
| TP6-010 | Volume HUD chip: small slider in top-right corner, persists to localStorage | P0 |
| TP6-011 | Mute toggle: `M` key, visual strikethrough on Sacred-Gold audio chip | P0 |
| TP6-012 | 3-channel mix: ambient / beacons / viewer with independent sliders | P2 |
| TP6-013 | Duck amount configurable (0.05 – 0.30) in settings | P2 |
| TP6-014 | Duck curve: smooth ease vs sharp cut option (default smooth) | P3 |
| TP6-015 | `prefers-reduced-motion` also dampens audio variability (no swelling crescendos) | P1 |
| TP6-016 | HRTF panning for headphone listeners (Three.js `PositionalAudio` already supports) | P2 |
| TP6-017 | Visited-beacon drone gain reduced 50% — less "calling", more "settled" | P2 |
| TP6-018 | Web Audio cleanup: dispose nodes on unmount, drop dangling refs | P0 |
| TP6-019 | Resume AudioContext on tab visibility regain (don't drift when hidden) | P0 |
| TP6-020 | Loudness normalization: target -14 LUFS across all assets (pipeline concern, flag) | P2 |
| TP6-021 | Convolution reverb on beacon drones — large hall IR for "cathedral" feel | P2 |
| TP6-022 | Audio-only mode: `A` key toggles scene visuals off, keeps audio (meditation use) | P3 |
| TP6-023 | Beat-sync hook: ambient drone modulation rate ties to 4-7-8 breath cycle | P3 |
| TP6-024 | Pulse indicator: small Coherence-Emerald dot in HUD pulses when audio active | P1 |
| TP6-025 | Crossfade between regions: ambient track shifts as character moves through zones | P3 |

---

## TP7 — Onboarding / First-Run (currently nonexistent)

**Shipped:** none. Plan items below define this surface from zero.

| ID | Item | Priority |
|---|---|---|
| TP7-001 | `localStorage.noesis_onboarded` flag drives first-run detection | P0 |
| TP7-002 | Black fade-in over 1.5s on first WorldPage mount (gap before WASD becomes responsive) | P0 |
| TP7-003 | Sigil draws progressively in center during the fade-in (`pathLength` 0 → 1) | P0 |
| TP7-004 | Caption: `THE FIELD IS AWAKENING` in font-mono uppercase appears at 50% of the fade | P0 |
| TP7-005 | Single low Coherence-Emerald tonal pulse plays at sigil completion | P1 |
| TP7-006 | Controls hint overlay: `WASD · SHIFT · G · ESC` chips for 5s, then auto-fade | P0 |
| TP7-007 | Suggested first-walk: subtle Sacred-Gold arrow on ground pointing to nearest beacon for 10s | P1 |
| TP7-008 | First-approach: enlarged DiscoveryPanel tooltip explaining "Press G to enter the mirror" | P0 |
| TP7-009 | First-open: AssetViewer shows `Press H any time for help` chip for 3s | P0 |
| TP7-010 | `H` key shows persistent controls map overlay (modal) | P0 |
| TP7-011 | "Skip onboarding" link top-right during first arrival | P0 |
| TP7-012 | Reveal beacons over 10s — one becomes visible per second so the field grows in front of you | P2 |
| TP7-013 | First-visit congratulation tone + caption `1 of 10 mirrors observed` | P1 |
| TP7-014 | Suggest next beacon after first close: small arrow to second-nearest | P1 |
| TP7-015 | Midpoint signal (5 visited): mid-progress chord + caption `the map is half-traced` | P2 |
| TP7-016 | Completion signal (all 10): final chord + `the system succeeds when you no longer need the map` + share button | P1 |
| TP7-017 | Returning-user variant: `WELCOME BACK · last visit 3 days ago` chip on world mount | P1 |
| TP7-018 | New-since-last-visit highlight: any beacons added since last visit glow gold for the first minute | P2 |
| TP7-019 | Onboarding state machine: `idle → arriving → walked → first-approach → first-open → first-close → completion` (in `gameStore`) | P0 |
| TP7-020 | Re-trigger onboarding via `?onboard=1` query param | P1 |
| TP7-021 | Tooltips dismissable individually (don't force a tour) | P0 |
| TP7-022 | Reduced-motion onboarding: no fades, just text + arrows | P0 |
| TP7-023 | Mobile onboarding variant: virtual joystick intro + touch-to-interact | P2 |
| TP7-024 | Sound check: brief test tone + `did you hear that?` yes/no during onboarding | P2 |
| TP7-025 | Headphone recommendation: if mobile + no headphones detected, show subtle notice | P3 |

---

## TP8 — HUD / Persistent Controls (`src/components/HUD.tsx` — new)

**Shipped:** Static control hints on intro page only. Nothing persistent in world.

| ID | Item | Priority |
|---|---|---|
| TP8-001 | Top-left brand sigil mini (32x32, opacity 0.3, hover 0.8) — click returns to home | P0 |
| TP8-002 | Top-right session chip: logged-in email + `[ sign out ]` link in font-mono | P0 |
| TP8-003 | Bottom-center control chips: `WASD · SHIFT · G · ESC` — auto-hide after 5s of input, reveal on mouse-move | P0 |
| TP8-004 | Bottom-right progress chip: `3 of 10 mirrors observed` in font-mono | P0 |
| TP8-005 | Right side: optional vertical mini-map showing character + beacons (toggle with `M`) | P1 |
| TP8-006 | Top-center compass: simple Sacred-Gold disc with N/E/S/W marks, rotates with character facing | P1 |
| TP8-007 | Audio indicator: small Coherence-Emerald dot pulses when audio active (top-right of HUD) | P1 |
| TP8-008 | FPS counter: `F` keypress toggles (font-mono lower-right) | P1 |
| TP8-009 | Quality cycle: `Q` cycles low → medium → high with toast notification | P1 |
| TP8-010 | Reduced-motion toggle: `Shift+R` keyboard | P1 |
| TP8-011 | Pause: `P` toggles pause overlay (Sacred-Gold `PAUSED` + ESC resumes) | P0 |
| TP8-012 | Help: `H` shows full keyboard map (modal) | P0 |
| TP8-013 | Mute: `M` toggles all audio with visual strikethrough indicator | P0 |
| TP8-014 | Settings: `S` opens slide-out panel (display / audio / keys / preferences) | P1 |
| TP8-015 | Key remap UI: drag-and-drop key bindings in settings | P3 |
| TP8-016 | Visited beacons list: `V` opens panel listing visited beacons + timestamps | P1 |
| TP8-017 | Field overview: `F` opens an overhead map view (paused while open) | P2 |
| TP8-018 | Session timer: subtle mono digits showing session duration | P2 |
| TP8-019 | Auto-hide HUD after 5s of no input; reveal on mouse movement OR keypress | P0 |
| TP8-020 | HUD respects screen reader order (logical landmarks) | P1 |
| TP8-021 | Mobile: virtual joystick (bottom-left) + interact button (bottom-right) | P2 |
| TP8-022 | Z-index discipline: HUD (10) < DiscoveryPanel (40) < AssetViewer (50) | P0 |
| TP8-023 | Persistent HUD preferences across sessions (toggles in localStorage) | P1 |
| TP8-024 | Notification dock: small chip area for "new beacon" / "session expiring soon" toasts | P2 |
| TP8-025 | Connection status: green / amber / red dot indicating worker reachability | P1 |
| TP8-026 | Time-of-day indicator if day/night cycle implemented (TP2-018) | P3 |
| TP8-027 | Inventory / collected indicators (if gamified progression added later) | P3 |
| TP8-028 | Field name banner: faint `HARSHITA'S FIELD` in top-center (drops at 4s) | P0 |
| TP8-029 | Quick-jump teleport menu: `T` shows visited beacons → click to teleport (accessibility) | P3 |
| TP8-030 | Idle warning: at 25 min inactive, soft warning chip; 30 min auto-sign-out | P2 |

---

## TP9 — Auth / Session States

**Shipped:** CF Access JWT flow working end-to-end; localStorage token; 401 auto-clear + redirect; flash banner support.

| ID | Item | Priority |
|---|---|---|
| TP9-001 | Session timer: decode JWT `exp`, show countdown in HUD when <10 min remaining | P1 |
| TP9-002 | Silent refresh: 5 min before expiry, attempt token refresh in background | P1 |
| TP9-003 | Refresh failure → graceful re-auth flow (return user to current beacon after re-sign-in) | P1 |
| TP9-004 | "Stay signed in" toggle in sign-out flow (extends `localStorage` persistence) | P2 |
| TP9-005 | Multi-tab session sync via `BroadcastChannel('noesis-auth')` — sign-out in one tab logs out all | P2 |
| TP9-006 | Sign-out confirmation modal (brief — "the field will recede; sign out?") | P1 |
| TP9-007 | Sign-out cleans up localStorage entirely (visited beacons, preferences, settings — or keep with explicit opt-in) | P0 |
| TP9-008 | Idle timeout: 30min triggers sign-out with 5min warning at 25min | P2 |
| TP9-009 | Last-active timestamp displayed in session chip | P2 |
| TP9-010 | Token expired mid-viewer-open: gracefully close viewer + show modal "session expired — sign in again" | P1 |
| TP9-011 | Network offline detection: small amber dot in HUD + offline banner "you are offline; viewer cached content available" | P2 |
| TP9-012 | Service worker for offline asset caching of recently-visited assets | P3 |
| TP9-013 | Email verification chip if email unverified (currently CF Access OTP guarantees email — but flag for future) | P3 |
| TP9-014 | Audit log endpoint: GET `/api/auth/log` shows recent sign-ins + IPs | P3 |
| TP9-015 | Revoke session button in settings (sends to CF Access logout URL) | P1 |
| TP9-016 | "Reading from" field showing which CF Access team (debug hint) | P3 |
| TP9-017 | Token rotation: bump rotation on each grant change (server-side) | P3 |
| TP9-018 | Cross-device handoff: QR code on intro to sign in mobile via desktop session | P3 |
| TP9-019 | "Sessions" page (`/account/sessions`) listing active devices with revoke action | P3 |
| TP9-020 | Auth event telemetry: track sign-in success/failure rates (placeholder) | P3 |

---

## Cross-cutting concerns (apply across multiple touchpoints)

| ID | Item | Touchpoints affected |
|---|---|---|
| XC-001 | Single `useReducedMotion` hook respected everywhere (already in WorldPage; expand to Home, AssetViewer, DiscoveryPanel) | TP1, TP4, TP5 |
| XC-002 | Settings persistence layer: typed wrapper around `localStorage` with schema versioning | TP6, TP8, TP9 |
| XC-003 | Telemetry stub: thin event-emitter that future analytics can hook (no PII) | All |
| XC-004 | Error boundary at WorldPage level: catches R3F renderer crashes, shows brand-aligned fallback | TP2, TP3 |
| XC-005 | Skeleton loaders matching brand: replace any spinning circles with progressively drawn sigils | TP1, TP4 |
| XC-006 | Toast/notification primitive (brand-aligned, top-center) for ephemeral status messages | TP1, TP4, TP7, TP8, TP9 |
| XC-007 | Color palette tokens exposed as CSS custom properties for animation interpolation (already in style.css; ensure all R3F materials use them) | TP2, TP3 |
| XC-008 | Brand sigil component: single source of truth React component (multiple sizes, multiple animation states) | TP1, TP4, TP7 |
| XC-009 | Heading hierarchy semantic correctness for SEO and a11y (h1 once per page, etc.) | TP1, TP4 |
| XC-010 | i18n scaffolding (English-only for now, but lift hard-coded strings into a single dict) | All |

---

## Suggested execution waves (after Phase 5 polish lands)

**Wave D — P0 items only** (~30 items): the highest-impact UX gaps. Targets: TP1 keyboard nav + session chip, TP3 visited state + label font fix, TP4 loading/error states + share button + keyboard, TP5 distance readout + click-to-open + type-icons, TP6 atmospheric ambient + autoplay gate + volume HUD, TP7 full first-run flow, TP8 persistent HUD essentials, TP9 sign-out + token-expired modal.

**Wave E — P1 polish** (~80 items): brand-resolution moves — beacon type-shapes, type-tinted chips, distance fog, scene tone-mapping swap, custom video controls, slides pagination, ambient drones, mini-map, session timer, share/download flows.

**Wave F — P2/P3 deep work**: marketplace-level features — minimize-modal, bookmarks, notes, mind-map interactive viewer, audio-only mode, field overview teleport, multi-device handoff, telemetry, day/night cycle.

---

## Notes on scope discipline

Per the user's directive:
- **No test or e2e items** in this catalogue — those belong to `docs/QUALITY-PLAN.md` (separate doc, not yet written)
- **No infrastructure refactors** — Wave G is for Vite chunk-splitting, Cloudflare Worker performance budgets, deployment pipeline improvements
- **No backend feature work beyond the existing API surface** — new endpoints (notes, ratings) are flagged P3 and out of scope until UI demand justifies them

Total: **~280 actionable UI/UX/feature items across 9 touchpoints + 10 cross-cutting** — enough granular work to feed several weeks of focused sprints. Tackle by Wave (D → E → F) rather than touchpoint to balance progress visibly across the surface.
