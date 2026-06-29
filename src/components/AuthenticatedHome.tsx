import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%, var(--noesis-flow) 100%)',
    fontFamily: 'var(--noesis-font-body)',
    padding: '2rem',
    overflow: 'hidden',
  },
  sigil: {
    width: '88px',
    height: 'auto',
    marginBottom: '1.5rem',
    opacity: 0.9,
    animation: 'khaBreath 6s infinite ease-in-out',
  },
  title: {
    fontFamily: 'var(--noesis-font-display)',
    fontSize: '1.6rem',
    fontWeight: 700,
    letterSpacing: '0.55rem',
    marginBottom: '0.5rem',
    color: 'var(--noesis-gold)',
    textShadow: '0 0 24px rgba(197, 160, 23, 0.18)',
  },
  subtitle: {
    fontFamily: 'var(--noesis-font-body)',
    fontSize: '0.75rem',
    letterSpacing: '0.18em',
    color: 'var(--noesis-silver)',
    marginBottom: '2rem',
    textTransform: 'uppercase',
  },
  description: {
    textAlign: 'center',
    maxWidth: '540px',
    lineHeight: 1.7,
    color: 'var(--noesis-parchment)',
    marginBottom: '2.5rem',
    opacity: 0.9,
    animation: 'fadeIn 2s ease',
  },
  grantsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem',
    animation: 'fadeIn 2s ease',
  },
  grantLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem 2rem',
    minWidth: '280px',
    background: 'rgba(197, 160, 23, 0.08)',
    border: '1px solid rgba(197, 160, 23, 0.3)',
    borderRadius: '4px',
    color: 'var(--noesis-gold)',
    textDecoration: 'none',
    fontFamily: 'var(--noesis-font-display)',
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.15rem',
    transition: 'all 0.3s ease',
  },
  grantLinkHover: {
    background: 'rgba(197, 160, 23, 0.15)',
    borderColor: 'var(--noesis-gold)',
    boxShadow: '0 0 20px rgba(197, 160, 23, 0.2)',
  },
  sectionLabel: {
    fontFamily: 'var(--noesis-font-body)',
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    color: 'var(--noesis-silver)',
    marginBottom: '1rem',
    textTransform: 'uppercase',
  },
  redirectingMessage: {
    fontFamily: 'var(--noesis-font-body)',
    fontSize: '0.8rem',
    color: 'var(--noesis-silver)',
    marginTop: '1rem',
    animation: 'fadeIn 1s ease',
  },
};

export default function AuthenticatedHome() {
  const { grants, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if exactly one grant
  useEffect(() => {
    if (!isLoading && isAuthenticated && grants.length === 1) {
      const personId = grants[0];
      navigate(`/p/${personId}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, grants, navigate]);

  // If exactly one grant, show redirecting state while navigating
  if (!isLoading && isAuthenticated && grants.length === 1) {
    return (
      <div style={styles.container}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={styles.sigil}
        />
        <div style={styles.title}>TRYAMBAKAM NOESIS</div>
        <div style={styles.subtitle}>Self-Consciousness as Technology</div>
        <p style={styles.redirectingMessage}>
          Entering your field...
        </p>
      </div>
    );
  }

  // Multiple grants - show selection
  return (
    <div style={styles.container}>
      <img
        src="/noesis-sigil.png"
        alt=""
        style={styles.sigil}
      />

      <div style={styles.title}>TRYAMBAKAM NOESIS</div>
      <div style={styles.subtitle}>Self-Consciousness as Technology</div>

      <div style={styles.description}>
        <p style={{ marginBottom: '1rem' }}>
          A private 3D memory palace for witness premium packs.
          The 16 symbolic mirrors of the Noesis Engine are cast here as a walkable field.
        </p>
        <p>
          Terrain becomes text. Distance becomes inquiry.
          What you find depends on where you stand.
        </p>
      </div>

      <div style={styles.sectionLabel}>Select a Reading</div>

      <div style={styles.grantsContainer}>
        {grants.map((personId) => (
          <GrantLink key={personId} personId={personId} />
        ))}
      </div>
    </div>
  );
}

function GrantLink({ personId }: { personId: string }) {
  // Format personId for display (capitalize first letter)
  const displayName = personId.charAt(0).toUpperCase() + personId.slice(1);

  return (
    <Link
      to={`/p/${personId}`}
      style={styles.grantLink}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, styles.grantLinkHover);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, {
          background: 'rgba(197, 160, 23, 0.08)',
          borderColor: 'rgba(197, 160, 23, 0.3)',
          boxShadow: 'none',
        });
      }}
    >
      {displayName}'s Field
    </Link>
  );
}
