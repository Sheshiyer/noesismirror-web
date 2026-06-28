import { Beacon, BeaconType, WorldConfig } from '../types/world';

const BEACON_TYPES: BeaconType[] = ['reading', 'audio', 'video', 'slides', 'study'];

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid world-config: "${field}" must be a non-empty string`);
  }
}

function assertBeaconType(value: unknown, field: string): asserts value is BeaconType {
  if (!BEACON_TYPES.includes(value as BeaconType)) {
    throw new Error(
      `Invalid world-config: "${field}" must be one of ${BEACON_TYPES.join(', ')}, got ${JSON.stringify(value)}`
    );
  }
}

function assertNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid world-config: "${field}" must be a number`);
  }
}

function assertBeacon(raw: unknown, index: number): Beacon {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`Invalid world-config: beacon at index ${index} must be an object`);
  }
  const beacon = raw as Record<string, unknown>;

  assertString(beacon.id, `beacons[${index}].id`);
  assertString(beacon.label, `beacons[${index}].label`);
  assertString(beacon.summary, `beacons[${index}].summary`);
  assertBeaconType(beacon.type, `beacons[${index}].type`);
  assertString(beacon.assetUrl, `beacons[${index}].assetUrl`);

  if (beacon.position === null || typeof beacon.position !== 'object') {
    throw new Error(`Invalid world-config: beacons[${index}].position must be an object`);
  }
  const position = beacon.position as Record<string, unknown>;
  assertNumber(position.x, `beacons[${index}].position.x`);
  assertNumber(position.z, `beacons[${index}].position.z`);

  return {
    id: beacon.id,
    label: beacon.label,
    summary: beacon.summary,
    type: beacon.type,
    position: { x: position.x, z: position.z },
    assetUrl: beacon.assetUrl,
  };
}

export function buildWorldConfig(raw: unknown): WorldConfig {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Invalid world-config: expected an object');
  }
  const data = raw as Record<string, unknown>;

  assertString(data.personId, 'personId');
  assertString(data.personName, 'personName');

  if (!Array.isArray(data.beacons)) {
    throw new Error('Invalid world-config: "beacons" must be an array');
  }

  return {
    personId: data.personId,
    personName: data.personName,
    beacons: data.beacons.map(assertBeacon),
  };
}
