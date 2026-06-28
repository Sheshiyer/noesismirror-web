export type BeaconType = 'reading' | 'audio' | 'video' | 'slides' | 'study';

export interface Beacon {
  id: string;
  label: string;
  summary: string;
  type: BeaconType;
  position: { x: number; z: number };
  assetUrl: string;
}

export interface WorldConfig {
  personId: string;
  personName: string;
  beacons: Beacon[];
}
