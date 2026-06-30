// ============================================================================
// Constants
// ============================================================================

/** Physics, movement, and animation blend config. Tweak here instead of in hooks. */
export const CHARACTER_CONFIG = {
  walkSpeed: 1.0,
  runSpeed: 3.5,
  rotateSpeed: 2.5,
  speedLerp: 0.1,
  rotationLerp: 0.15,
  animBlendLerp: 0.15,
} as const;

// Character mesh name constants
export const BODY_MESH_NAMES: readonly string[] = [
  'Astronaut_Suit_Body_Detail_01_Mesh',
  'Astronaut_Suit_Body_Mesh',
  'Astronaut_Suit_Shoes_Mesh',
];


export const BODY_TEXTURE_PATHS = {
  map: '/textures/Body/Astronaut_Suit_Body_Albedo.ktx2',
  metalnessMap: '/textures/Body/Astronaut_Suit_Body_Metallic.ktx2',
  aoMap: '/textures/Body/Astronaut_Suit_Body_Ao.ktx2',
  normalMap: '/textures/Body/Astronaut_Suit_Body_Normals.ktx2',
};

export const DETAIL_TEXTURE_PATHS = {
  map: '/textures/Details/Astronaut_Suit_Details_Albedo.ktx2',
  metalnessMap: '/textures/Details/Astronaut_Suit_Details_Metallic.ktx2',
  aoMap: '/textures/Details/Astronaut_Suit_Details_Ao.ktx2',
  normalMap: '/textures/Details/Astronaut_Suit_Details_Normals.ktx2',
};

// ============================================================================
// Avatar profiles — three Plumber-family options + the original astronaut.
// Resolution rule per design spec:
//   1. genderPreference 'male'   → custom-male  (overrides report)
//   2. genderPreference 'female' → custom-female (overrides report)
//   3. genderPreference 'auto' + worldGender='female'      → custom-female
//   4. genderPreference 'auto' + worldGender='male'/absent → custom-male
//   5. genderPreference 'auto' + worldGender='androgynous' → custom-male (default)
// Set AVATAR_PROFILE_FORCE = 'astronaut' for instant rollback to the
// pre-Plumber state (skips the gender-resolution flow entirely).
// ============================================================================

export type AvatarProfileId = 'astronaut' | 'custom-male' | 'custom-female';

export const AVATAR_PROFILES: Record<AvatarProfileId, {
  modelPaths: string[];
  useExternalMaterials: boolean;
}> = {
  astronaut: {
    modelPaths: [
      '/models/Astronaut.glb',
      '/models/Idle.glb',
      '/models/Walking.glb',
      '/models/Running.glb',
      '/models/WalkingBack.glb',
    ],
    useExternalMaterials: true,
  },
  'custom-male': {
    modelPaths: [
      '/models/avatar/Avatar.glb',
      '/models/avatar/Idle.glb',
      '/models/avatar/Walking.glb',
      '/models/avatar/Running.glb',
      '/models/avatar/WalkingBack.glb',
    ],
    useExternalMaterials: false,
  },
  'custom-female': {
    modelPaths: [
      '/models/avatar-female/Avatar.glb',
      '/models/avatar-female/Idle.glb',
      '/models/avatar-female/Walking.glb',
      '/models/avatar-female/Running.glb',
      '/models/avatar-female/WalkingBack.glb',
    ],
    useExternalMaterials: false,
  },
};

/** Set to 'astronaut' to bypass the Plumber gender flow entirely. */
export const AVATAR_PROFILE_FORCE: AvatarProfileId | null = null;

/**
 * Resolve which avatar profile is active given the user's preference and the
 * world config's gender hint (from the depth-reading report).
 */
export function resolveAvatarProfileId(
  worldGender: 'male' | 'female' | 'androgynous' | undefined,
  settingPref: 'auto' | 'male' | 'female',
): AvatarProfileId {
  if (AVATAR_PROFILE_FORCE) return AVATAR_PROFILE_FORCE;
  if (settingPref === 'male') return 'custom-male';
  if (settingPref === 'female') return 'custom-female';
  // 'auto' — defer to world gender
  if (worldGender === 'female') return 'custom-female';
  return 'custom-male';
}

// Module-level constant kept for backwards compatibility (App.tsx
// useGLTF.preload still imports MODEL_PATHS). Preloads ALL three profile
// path sets so the user can switch without a full asset re-fetch — extra
// initial network but every profile lands instantly afterward.
export const MODEL_PATHS: string[] = Array.from(
  new Set([
    ...AVATAR_PROFILES.astronaut.modelPaths,
    ...AVATAR_PROFILES['custom-male'].modelPaths,
    ...AVATAR_PROFILES['custom-female'].modelPaths,
  ]),
);

// Backwards-compat re-exports for components that pinned to the legacy names.
// Resolve to the male profile so the existing code path keeps working until
// it migrates to resolveAvatarProfileId.
export const ACTIVE_PROFILE = AVATAR_PROFILES['custom-male'];

// ============================================================================
// Types
// ============================================================================

export interface CharacterProps {
  position?: [number, number, number];
  scale?: number;
  visible?: boolean;
  /** Optional gender hint from WorldConfig.gender (report-derived). Used by
   *  useCharacterAssets to resolve the active avatar profile when the user's
   *  Settings preference is 'auto'. */
  worldGender?: 'male' | 'female' | 'androgynous';
}

export interface CharacterState {
  currentSpeed: number;
  targetSpeed: number;
  maxSpeed: number;
  rotateSpeed: number;
  speedLerpFactor: number;
  animBlendLerpFactor: number;
  currentIdleWeight: number;
  currentWalkWeight: number;
  isMoving: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
}

// src/core/physics/types.ts
export interface PhysicsState {
  speed: number;
  rotationVelocity: number; // Used for FPV smoothing

  // Animation weights
  idleWeight: number;
  walkWeight: number;
  runWeight: number;
  backWeight: number;

  // Config Parameters
  walkSpeed: number;
  runSpeed: number;
  backSpeed: number;
  rotateSpeed: number; // Base rotation speed

  // Smoothing Factors
  speedLerpFactor: number;
  rotationLerpFactor: number;
  animBlendLerpFactor: number;
}

export const INITIAL_PHYSICS_STATE: PhysicsState = {
  speed: 0,
  rotationVelocity: 0,
  idleWeight: 1.0,
  walkWeight: 0.0,
  runWeight: 0.0,
  backWeight: 0.0,
  walkSpeed: 1.0,
  runSpeed: 3.5,
  backSpeed: 0.6,
  rotateSpeed: 2.5,
  speedLerpFactor: 0.1,
  rotationLerpFactor: 0.15,
  animBlendLerpFactor: 0.15,
};