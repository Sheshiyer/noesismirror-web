# Noesis Mirror — False Earth Base

An interactive, person-specific 3D world built on top of [False Earth](https://github.com/momentchan/false-earth) by Ming-Jyun Hung. Each world is defined by a `world-config.json` beacon pack; as you walk the procedural terrain, beacons become approachable and can be opened to reveal readings, audio, video, slides, or study guides.

## What it is

- **Procedural world**: False Earth's WebGPU grass, terrain, sky, and third-person character.
- **Beacon packs**: A JSON pack per person places interactive content beacons in the world.
- **Discovery UI**: Glassmorphism discovery panel, modal asset viewer, keyboard navigation, reduced-motion support, and a live HUD.
- **Routing**: `/:personId` loads a person's world (`/harshita` loads `public/packs/harshita/world-config.json`).

## Tech Stack

- React 19 + TypeScript + Vite
- React Three Fiber 9 + Three.js WebGPU renderer + TSL
- Zustand (game state) + Tailwind CSS (UI) + `react-router-dom`
- Vitest + Testing Library + jsdom

## Getting Started

```bash
npm install
npm run dev    # HTTPS dev server (WebGPU requires a secure context in most browsers)
npm run build
npm run preview
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Adding a Person Pack

Create a directory under `public/packs/<personId>/` and add a `world-config.json` file:

```json
{
  "personId": "harshita",
  "personName": "Harshita",
  "beacons": [
    {
      "id": "study",
      "label": "Study Guide",
      "summary": "A curated study guide.",
      "type": "study",
      "position": { "x": 5, "z": 5 },
      "assetUrl": "/packs/harshita/reports/study-guide.md"
    },
    {
      "id": "reading",
      "label": "Reading Notes",
      "summary": "Collected reading notes.",
      "type": "reading",
      "position": { "x": -5, "z": 8 },
      "assetUrl": "/packs/harshita/reports/reading.html"
    }
  ]
}
```

Supported beacon types: `reading`, `audio`, `video`, `slides`, `study`.

## Controls

- **WASD / Arrow keys**: Move the character
- **Arrow Up/Down/Left/Right (when no modal is open)**: Cycle beacons
- **Enter**: Open the selected beacon
- **Escape**: Close the asset viewer

## Project Structure

```
src/
├── app/App.tsx              # Canvas + WebGPU renderer
├── components/
│   ├── WorldPage.tsx        # UI overlay integration
│   ├── DiscoveryPanel.tsx   # Beacon discovery panel
│   ├── AssetViewer.tsx      # Modal asset viewer
│   ├── BeaconAnnouncer.tsx  # ARIA live region
│   ├── assetRenderers/      # Per-type asset viewers
│   ├── character/           # Third-person character
│   ├── grass/               # WebGPU procedural grass
│   ├── Terrain.tsx          # Procedural terrain
│   └── background/          # Starry sky
├── hooks/
│   ├── useWorldConfig.ts    # world-config.json loader
│   ├── useBeaconProximity.ts# Proximity detection
│   ├── useBeaconKeyboard.ts # Keyboard navigation
│   └── useReducedMotion.ts  # Reduced-motion preference
├── types/world.ts           # Beacon / WorldConfig types
└── utils/buildWorldConfig.ts# Config validation
```

## Attribution

This project builds on **False Earth** by Ming-Jyun Hung.
See [ATTRIBUTION.md](./ATTRIBUTION.md) for full details.

Noesis-specific features are original work.
