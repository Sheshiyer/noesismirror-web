export type BeaconType = 'reading' | 'audio' | 'video' | 'slides' | 'study';
export type BeaconState = 'dormant' | 'approachable' | 'active';

export interface Beacon {
  id: string;
  label: string;
  summary: string;
  type: BeaconType;
  position: { x: number; z: number };
  assetUrl: string;
  order?: number;
  context?: string;
}

export interface WorldConfig {
  personId: string;
  personName: string;
  beacons: Beacon[];
  /** Optional gender from the depth-reading report. When present, drives the
   *  default avatar choice (male/female Plumber). The Settings preference in
   *  the game store overrides this. Absent → falls back to 'male' Plumber. */
  gender?: 'male' | 'female' | 'androgynous';
}
