import { useParams } from 'react-router-dom';
import { useWorldConfig } from '../hooks/useWorldConfig';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import { WorldConfig } from '../types/world';
import App from '../app/App';

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  dormant: { background: '#52525b', color: '#fff' },
  approachable: { background: '#facc15', color: '#000' },
  active: { background: '#34d399', color: '#000' },
};

export default function WorldPage() {
  const { personId } = useParams<{ personId: string }>();
  const { config, loading, error } = useWorldConfig(personId);

  if (loading) {
    return <div style={{ color: '#fff', padding: '2rem' }}>Loading world…</div>;
  }

  if (error || !config) {
    return (
      <div style={{ color: '#ff6b6b', padding: '2rem' }}>
        Error loading world: {error?.message ?? 'Unknown error'}
      </div>
    );
  }

  return (
    <>
      <HUD config={config} />
      <App config={config} />
    </>
  );
}

interface HUDProps {
  config: WorldConfig;
}

function HUD({ config }: HUDProps) {
  const { states } = useBeaconProximity(config.beacons);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.6)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: 8,
        fontFamily: 'sans-serif',
        fontSize: 14,
        pointerEvents: 'none',
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>
        {config.personName}'s World
      </div>
      <div>
        {config.beacons.map((beacon) => {
          const state = states[beacon.id] ?? 'dormant';
          return (
            <div
              key={beacon.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span>{beacon.label}</span>
              <span
                style={{
                  ...BADGE_STYLES[state],
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  textTransform: 'uppercase',
                }}
              >
                {state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

