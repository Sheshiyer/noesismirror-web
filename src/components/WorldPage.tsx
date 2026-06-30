import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorldConfig, AuthError } from '../hooks/useWorldConfig';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import { useBeaconKeyboard } from '../hooks/useBeaconKeyboard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import App from '../app/App';
import DiscoveryPanel from './DiscoveryPanel';
import AssetViewer from './AssetViewer';
import BeaconAnnouncer from './BeaconAnnouncer';
import HUD from './HUD';
import Onboarding from './Onboarding';
import AmbientAudio from './AmbientAudio';

export default function WorldPage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const { config, loading, error } = useWorldConfig(personId);
  const reducedMotion = useReducedMotion();
  const [selectedBeaconId, setSelectedBeaconId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Re-auth on AuthError: clear stale token (401) and bounce to / with flash state.
  useEffect(() => {
    if (!(error instanceof AuthError)) return;
    if (error.status === 401) {
      localStorage.removeItem('noesis_token');
      navigate('/', { replace: true, state: { reason: 'session_expired' } });
    } else if (error.status === 403) {
      navigate('/', { replace: true, state: { reason: 'no_access', personId } });
    }
  }, [error, navigate, personId]);

  const { states, activeBeaconId, distances } = useBeaconProximity(config?.beacons ?? []);

  const displayBeaconId = selectedBeaconId ?? activeBeaconId;
  const displayBeacon = useMemo(
    () => config?.beacons.find((beacon) => beacon.id === displayBeaconId) ?? null,
    [config, displayBeaconId]
  );

  useBeaconKeyboard({
    beacons: config?.beacons ?? [],
    activeBeaconId: displayBeaconId,
    onSelect: setSelectedBeaconId,
    onOpen: (id) => {
      setSelectedBeaconId(id);
      setViewerOpen(true);
    },
    viewerOpen,
    onCloseViewer: () => setViewerOpen(false),
  });

  if (loading) {
    return (
      <div className="home-container">
        <div className="brand-sigil-container">
          <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="brand-sigil loading" />
        </div>
        <div className="loading-text">ENTERING FIELD</div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="home-container">
        <div className="brand-sigil-container">
          <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="brand-sigil" />
        </div>
        <div className="title" style={{ color: 'var(--noesis-terracotta)' }}>FIELD UNAVAILABLE</div>
        <p className="auth-message">{error?.message ?? 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <App config={config} />
      <BeaconAnnouncer activeBeacon={displayBeacon} />
      {displayBeacon && (
        <DiscoveryPanel
          beacon={displayBeacon}
          state={states[displayBeacon.id] ?? 'dormant'}
          distance={distances[displayBeacon.id] ?? Infinity}
          reducedMotion={reducedMotion}
          personId={personId!}
          onOpen={() => setViewerOpen(true)}
        />
      )}
      {viewerOpen && displayBeacon && (
        <AssetViewer
          beacon={displayBeacon}
          onClose={() => setViewerOpen(false)}
          reducedMotion={reducedMotion}
        />
      )}
      <HUD
        personId={personId!}
        personName={config.personName}
        beacons={config.beacons}
      />
      <Onboarding />
      <AmbientAudio />
    </div>
  );
}
