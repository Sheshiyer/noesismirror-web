# Brand the Full Experience & Wire Premium Assets — Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all unbranded placeholder screens and wire the full premium asset pack so every beacon type (reading, audio, video, slides, study) renders real content from `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/.premium-assets/harshita/`.

**Architecture:**
- The Noesis design system is already defined in `src/style.css` with CSS custom properties (`--noesis-void`, `--noesis-gold`, `--noesis-witness`, etc.) and animations (`khaBreath`, `goldPulse`, `fadeIn`). Every user-facing HTML surface (home page, world loading state, HUD, discovery panel, asset viewer modal) must use these tokens — no raw hex colors, no Tailwind-only surfaces.
- Premium assets live at an external path. We symlink them into `public/packs/harshita/` so they are served by Vite's static server. The `world-config.json` is expanded with real beacons for every available asset type.
- Asset renderers are updated to handle the real file types (`.mp3`, `.mp4`, `.pdf`, `.json` mind-map) with proper branded UI wrappers.

**Tech Stack:**
- React 19 + TypeScript + Tailwind CSS + CSS custom properties
- Vite 7 static asset serving
- Existing components: Home, WorldPage, DiscoveryPanel, AssetViewer, assetRenderers/*

---

## Task 1: Brand the Home page

**Files:**
- Modify: `src/components/Home.tsx`

The current Home page is an unbranded black div with inline styles. It must use the Noesis design tokens from `style.css` and match the visual language of the LoadingScreen component (gradient background, sigil, display/body fonts, gold/void palette).

**Step 1: Rewrite `src/components/Home.tsx`**

Replace the entire file with a branded landing page that uses:

- Background: same gradient as LoadingScreen (`linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%, var(--noesis-flow) 100%)`)
- Fonts: `var(--noesis-font-display)` for titles, `var(--noesis-font-body)` for body
- Sigil: render the `/noesis-sigil.png` with `khaBreath` animation
- Title: "TRYAMBAKAM NOESIS" in gold with text shadow
- Subtitle: "Self-Consciousness as Technology"
- Link button: styled like LoadingScreen's "[ ENTER FIELD ]" button with goldPulse animation, reading "ENTER HARSHITA'S WORLD"
- The link routes to `/p/harshita`
- No Tailwind classes — use CSS custom properties via inline styles (consistent with LoadingScreen approach)

```tsx
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%, var(--noesis-flow) 100%)',
      fontFamily: 'var(--noesis-font-body)',
      color: 'var(--noesis-parchment)',
      overflow: 'hidden',
    }}>
      <img
        src="/noesis-sigil.png"
        alt=""
        style={{
          width: '88px', height: 'auto',
          marginBottom: '1.5rem',
          opacity: 0.9,
          animation: 'khaBreath 6s infinite ease-in-out',
        }}
      />
      <div style={{
        fontFamily: 'var(--noesis-font-display)',
        fontSize: '1.6rem', fontWeight: 700,
        letterSpacing: '0.55rem',
        marginBottom: '0.5rem',
        color: 'var(--noesis-gold)',
        textShadow: '0 0 24px rgba(197, 160, 23, 0.18)',
      }}>
        TRYAMBAKAM NOESIS
      </div>
      <div style={{
        fontFamily: 'var(--noesis-font-body)',
        fontSize: '0.75rem', letterSpacing: '0.18em',
        color: 'var(--noesis-silver)',
        marginBottom: '2rem',
        textTransform: 'uppercase',
      }}>
        Self-Consciousness as Technology
      </div>
      <Link
        to="/p/harshita"
        style={{
          color: 'var(--noesis-gold)', backgroundColor: 'transparent',
          border: '1px solid var(--noesis-gold)',
          padding: '0.75rem 2rem',
          fontFamily: 'var(--noesis-font-display)', fontWeight: 600,
          fontSize: '1rem', letterSpacing: '0.25rem',
          textDecoration: 'none',
          cursor: 'pointer',
          animation: 'goldPulse 2.5s infinite ease-in-out',
          textShadow: '0 0 18px rgba(197, 160, 23, 0.35)',
        }}>
        ENTER FIELD
      </Link>
    </div>
  );
}
```

**Step 2: Run lint, typecheck, and verify dev server**

```bash
npm run lint
npm run typecheck
```

Expected: 0 errors (may have existing 2 warnings from Task 1 workaround).

Start dev server and visit `http://localhost:5174/`:
```bash
npm run dev
```

Expected: branded home page with gradient, sigil, gold text. No black screen.

**Step 3: Commit**

```bash
git add src/components/Home.tsx
git commit -m "feat: brand the Home page with Noesis design system"
```

---

## Task 2: Wire premium assets into public/packs

**Files:**
- Create: symlinks in `public/packs/harshita/` pointing to premium asset paths
- Modify: `public/packs/harshita/world-config.json`

The premium assets live at `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/.premium-assets/harshita/`. Vite serves files under `public/` as static assets. Symlinks work correctly for Vite's dev server and build.

**Asset inventory to wire:**

| Source (premium-assets) | Target (public/packs/harshita) | Beacon type |
|---|---|---|
| `local/reading.html` | `reports/reading.html` (replace stub) | reading |
| `reports/study-guide.md` | `reports/study-guide.md` (replace stub) | study |
| `reports/briefing.md` | `reports/briefing.md` | study |
| `audio/deep-dive-long.mp3` | `audio/deep-dive-long.mp3` | audio |
| `video/video-brief.mp4` | `video/video-brief.mp4` | video |
| `slide-decks/detailed.pdf` | `slides/detailed.pdf` | slides |
| `slide-decks/preview.pdf` | `slides/preview.pdf` | slides |
| `quiz/quiz.md` | `reports/quiz.md` | study |
| `flashcards/flashcards.md` | `reports/flashcards.md` | study |
| `mind-map/Harshita's Personal Companion Dossier.json` | `reports/mind-map.json` | study |

**Step 1: Create directories and symlink assets**

```bash
mkdir -p public/packs/harshita/audio
mkdir -p public/packs/harshita/video
mkdir -p public/packs/harshita/slides
```

```bash
PREMIUM="/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/.premium-assets/harshita"
PUB="public/packs/harshita"

ln -sf "$PREMIUM/local/reading.html" "$PUB/reports/reading.html"
ln -sf "$PREMIUM/reports/study-guide.md" "$PUB/reports/study-guide.md"
ln -sf "$PREMIUM/reports/briefing.md" "$PUB/reports/briefing.md"
ln -sf "$PREMIUM/audio/deep-dive-long.mp3" "$PUB/audio/deep-dive-long.mp3"
ln -sf "$PREMIUM/video/video-brief.mp4" "$PUB/video/video-brief.mp4"
ln -sf "$PREMIUM/slide-decks/detailed.pdf" "$PUB/slides/detailed.pdf"
ln -sf "$PREMIUM/slide-decks/preview.pdf" "$PUB/slides/preview.pdf"
ln -sf "$PREMIUM/quiz/quiz.md" "$PUB/reports/quiz.md"
ln -sf "$PREMIUM/flashcards/flashcards.md" "$PUB/reports/flashcards.md"
ln -sf "$PREMIUM/mind-map/Harshita's Personal Companion Dossier.json" "$PUB/reports/mind-map.json"
```

Expected: all symlinks resolve — verify with `ls -la public/packs/harshita/reports/reading.html`

**Step 2: Verify dev server serves the assets**

```bash
npm run dev
```

Visit `http://localhost:5174/packs/harshita/reports/reading.html` — expected: the full premium reading HTML page renders.

**Step 3: Commit the symlinks**

```bash
git add public/packs/harshita/
git commit -m "feat: wire premium assets via symlinks into public/packs"
```

**Note about symlinks on macOS/Vite:** Vite resolves symlinks correctly in both dev and build. The files appear in `dist/` as copied assets.

---

## Task 3: Expand world-config.json with all beacon types

**Files:**
- Modify: `public/packs/harshita/world-config.json`

Replace the current 2-beacon config with a full config that includes all premium asset types. Each beacon positioned around the terrain so they don't overlap.

**Step 1: Write the full world-config.json**

```json
{
  "personId": "harshita",
  "personName": "Harshita",
  "beacons": [
    {
      "id": "reading",
      "label": "Premium Witness Pack",
      "summary": "The full reading — a complete witness dossier with provenance and reflections.",
      "type": "reading",
      "position": { "x": -12, "z": -8 },
      "assetUrl": "/packs/harshita/reports/reading.html",
      "order": 1,
      "context": "Start here — the core witness text."
    },
    {
      "id": "study",
      "label": "Study Guide",
      "summary": "A structured study guide to deepen your engagement with witness concepts.",
      "type": "study",
      "position": { "x": 14, "z": 9 },
      "assetUrl": "/packs/harshita/reports/study-guide.md",
      "order": 2,
      "context": "After reading — structure your learning path."
    },
    {
      "id": "briefing",
      "label": "Briefing Notes",
      "summary": "Executive summary and key takeaways from the witness dossier.",
      "type": "study",
      "position": { "x": -5, "z": 14 },
      "assetUrl": "/packs/harshita/reports/briefing.md",
      "order": 3,
      "context": "Quick synthesis — when time is short."
    },
    {
      "id": "audio",
      "label": "Deep Dive Audio",
      "summary": "A long-form audio companion to the witness pack — listen while you walk.",
      "type": "audio",
      "position": { "x": 10, "z": -12 },
      "assetUrl": "/packs/harshita/audio/deep-dive-long.mp3",
      "order": 4,
      "context": "For the ears — absorb through listening."
    },
    {
      "id": "video",
      "label": "Video Brief",
      "summary": "A visual exploration of the witness dossier themes.",
      "type": "video",
      "position": { "x": -15, "z": 5 },
      "assetUrl": "/packs/harshita/video/video-brief.mp4",
      "order": 5,
      "context": "Watch — see the concepts in motion."
    },
    {
      "id": "slides-detailed",
      "label": "Detailed Slide Deck",
      "summary": "A comprehensive slide deck covering all witness pack topics in depth.",
      "type": "slides",
      "position": { "x": 8, "z": 15 },
      "assetUrl": "/packs/harshita/slides/detailed.pdf",
      "order": 6,
      "context": "Present — share the work with others."
    },
    {
      "id": "slides-preview",
      "label": "Preview Slide Deck",
      "summary": "A concise preview slide deck — highlights at a glance.",
      "type": "slides",
      "position": { "x": 0, "z": 17 },
      "assetUrl": "/packs/harshita/slides/preview.pdf",
      "order": 7,
      "context": "Quick overview — hit the high points."
    },
    {
      "id": "quiz",
      "label": "Knowledge Quiz",
      "summary": "Test your recall and understanding of witness concepts.",
      "type": "study",
      "position": { "x": 16, "z": -5 },
      "assetUrl": "/packs/harshita/reports/quiz.md",
      "order": 8,
      "context": "Prove it — what have you absorbed?"
    },
    {
      "id": "flashcards",
      "label": "Flashcards",
      "summary": "Spaced-repetition flashcards for key witness terms and concepts.",
      "type": "study",
      "position": { "x": -16, "z": -3 },
      "assetUrl": "/packs/harshita/reports/flashcards.md",
      "order": 9,
      "context": "Remember — drill the vocabulary."
    },
    {
      "id": "mind-map",
      "label": "Mind Map",
      "summary": "A visual mind map of the witness companion dossier — see how concepts connect.",
      "type": "study",
      "position": { "x": 3, "z": -16 },
      "assetUrl": "/packs/harshita/reports/mind-map.json",
      "order": 10,
      "context": "Connect — trace the concept lattice."
    }
  ]
}
```

**Step 2: Verify the world-config.json is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/packs/harshita/world-config.json','utf8')); console.log('Valid JSON')"
```

**Step 3: Commit**

```bash
git add public/packs/harshita/world-config.json
git commit -m "feat: expand world-config with 10 beacons covering all premium asset types"
```

---

## Task 4: Update asset renderers for premium asset types

**Files:**
- Modify: `src/components/assetRenderers/renderers.tsx`
- Modify: `src/components/assetRenderers/registry.ts` (if adding new types)

Current renderer gaps for the premium assets:
1. **SlidesViewer** — uses `<iframe>` with PDFs but no fallback if PDF fails to embed. Add a download link fallback.
2. **StudyViewer** — renders Markdown as plain text but doesn't handle `.json` files (mind-map). Need to detect `.json` URLs and render a structured tree.
3. **AudioViewer** — works for `.mp3` but should be wrapped in a branded container.
4. **ReadingViewer** — uses `<iframe>` with `sandbox=""` which blocks scripts/styles. The premium reading HTML has embedded CSS — we need `sandbox="allow-same-origin"` so the content renders correctly.
5. **VideoViewer** — works for `.mp4` but should have a branded container.

**Step 1: Fix ReadingViewer sandbox**

The iframe `sandbox=""` (empty) blocks everything. Change to `sandbox` prop removed entirely (since same-origin HTML is safe) or use `sandbox="allow-same-origin"`.

Edit `renderers.tsx` ReadingViewer — remove `sandbox=""` from the `<iframe>` tag.

**Step 2: Add MindMap viewer to StudyViewer**

When `beacon.assetUrl` ends with `.json`, render an indented tree from the JSON's hierarchical structure. Parse `{ name, children }` recursively.

Add above the existing StudyViewer return a check:

```tsx
if (beacon.assetUrl.endsWith('.json')) {
  // render MindMapJsonView
}
```

Create a small sub-component:

```tsx
interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

function renderTree(nodes: MindMapNode[], depth = 0): React.ReactNode {
  return (
    <ul className={`list-none ${depth > 0 ? 'ml-4' : ''}`}>
      {nodes.map((node, i) => (
        <li key={i} className="text-white/90 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
          <span className={depth === 0 ? 'text-[var(--noesis-gold)] text-sm font-semibold' : 'text-[var(--noesis-parchment)] text-sm'}>
            {node.name}
          </span>
          {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
        </li>
      ))}
    </ul>
  );
}
```

**Step 3: Add fallback to SlidesViewer**

The current SlidesViewer uses `<iframe sandbox="">` on the PDF URL. Most browsers won't render PDF in a sandboxed iframe. Add a fallback download link:

```tsx
export const SlidesViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="space-y-4">
      <iframe
        className="w-full h-96 rounded border border-white/10 bg-white"
        src={beacon.assetUrl}
        title={beacon.label}
      />
      <a
        href={beacon.assetUrl}
        download
        className="inline-block px-4 py-2 rounded border border-[var(--noesis-gold)] text-[var(--noesis-gold)] text-sm hover:bg-[var(--noesis-gold)]/10 transition-colors"
      >
        Download slides
      </a>
    </div>
  );
};
```

**Step 4: Brand the AudioViewer wrapper**

Wrap the audio element in a styled container:

```tsx
export const AudioViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="rounded border border-white/10 bg-black/40 p-4">
      <p className="text-sm text-[var(--noesis-silver)] mb-2">Audio Companion</p>
      <audio controls src={beacon.assetUrl} className="w-full" />
    </div>
  );
};
```

**Step 5: Brand the VideoViewer wrapper**

```tsx
export const VideoViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="rounded border border-white/10 bg-black/40 overflow-hidden">
      <video
        controls
        src={beacon.assetUrl}
        className="w-full max-h-[60vh]"
      />
    </div>
  );
};
```

**Step 6: Run tests, lint, typecheck**

```bash
npm run lint
npm run typecheck
npm test
```

Expected: all pass. The existing tests for AssetViewer may need updates if props changed.

**Step 7: Commit**

```bash
git add src/components/assetRenderers/
git commit -m "feat: update asset renderers for premium content (mind-map, branded wrappers, PDF fallback)"
```

---

## Task 5: Brand the world loading state

**Files:**
- Modify: `src/components/WorldPage.tsx`

The current WorldPage loading state is a plain div: `<div className="text-white p-8">Loading world…</div>`. This shows as a white-text-on-black screen while the world-config.json is fetched and the GPU world initializes. It must use the Noesis design tokens.

**Step 1: Update the loading branch in WorldPage.tsx**

Replace the loading div:

```tsx
if (loading) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%)',
      fontFamily: 'var(--noesis-font-body)',
      color: 'var(--noesis-parchment)',
      zIndex: 9998,
    }}>
      <img
        src="/noesis-sigil.png"
        alt=""
        style={{
          width: '64px', height: 'auto', marginBottom: '1rem',
          opacity: 0.85, animation: 'khaBreath 3s infinite ease-in-out',
        }}
      />
      <div style={{
        fontFamily: 'var(--noesis-font-display)', fontSize: '0.9rem',
        fontWeight: 600, letterSpacing: '0.3rem',
        color: 'var(--noesis-gold)',
        textShadow: '0 0 18px rgba(197, 160, 23, 0.2)',
      }}>
        ENTERING FIELD
      </div>
    </div>
  );
}
```

Also update the error state similarly.

**Step 2: Verify with dev server**

```bash
npm run dev
```

Navigate to `/p/harshita` and verify the "ENTERING FIELD" branded screen appears before the 3D world loads.

**Step 3: Commit**

```bash
git add src/components/WorldPage.tsx
git commit -m "feat: brand the world loading state with Noesis design system"
```

---

## Task 6: Verify the full experience end-to-end

**Files:**
- None (verification only)

**Step 1: Run full pipeline**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all pass with 0 errors.

**Step 2: Manual smoke test checklist**

Run `npm run dev` and verify:

| Check | Expected |
|---|---|
| Visit `/` | Branded home page with sigil, gold title, "ENTER FIELD" button. No black/white placeholder. |
| Click "ENTER FIELD" | Navigates to `/p/harshita`. Shows branded "ENTERING FIELD" screen, then 3D world loads. |
| Walk to reading beacon | Discovery panel opens showing "Premium Witness Pack". Click "Open" → AssetViewer shows the full reading HTML. |
| Walk to audio beacon | Audio player renders with playback controls for deep-dive-long.mp3. |
| Walk to video beacon | Video player renders with video-brief.mp4. |
| Walk to slides beacon | PDF iframe + download link renders. |
| Walk to study beacon (study-guide) | Markdown content renders in prose container. |
| Walk to mind-map beacon | JSON tree renders with gold top-level nodes and nested children. |
| Close asset viewer (Escape) | Modal closes, focus returns. |
| HUD badges update | Badge colors change as you walk between beacons. |

**Step 3: Commit verification**

```bash
git commit --allow-empty -m "verify: end-to-end branded experience confirmed"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-06-29-brand-full-experience.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

**Which approach?**