import { useParams } from 'react-router-dom';
import { useWorldConfig } from '../hooks/useWorldConfig';
import App from '../app/App';

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

  return <App config={config} />;
}
