import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

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
  enterButton: {
    color: 'var(--noesis-gold)',
    backgroundColor: 'transparent',
    border: 'none',
    letterSpacing: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--noesis-font-display)',
    fontSize: '1rem',
    fontWeight: 600,
    textShadow: '0 0 18px rgba(197, 160, 23, 0.35)',
    animation: 'goldPulse 2.5s infinite ease-in-out',
    textDecoration: 'none',
  },
};

export default function Home() {
  const { isAuthenticated, isLoading, grants } = useAuth();
  const navigate = useNavigate();

  // If authenticated, redirect to home or first grant
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (grants.length === 1) {
        navigate(`/p/${grants[0]}`, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, grants, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.description}>Entering the field...</div>
      </div>
    );
  }

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

      <button
        onClick={() => {
          if (isAuthenticated) {
            // Should be handled by useEffect, but fallback
            navigate('/home');
          } else {
            // Redirect to Cloudflare Access login URL
            // After login, CF Access will redirect back to the provided URL
            const team = 'red-queen-4dfa';
            const aud = '11a62a84e3644d9610584bb2da4ca5b69f32f8dd486c43b714f67cd02ad303fd';
            const redirectUrl = encodeURIComponent('https://314.tryambakam.space/home');
            const loginUrl = `https://${team}.cloudflareaccess.com/cdn-cgi/access/login/314.tryambakam.space?kid=${aud}&redirect_url=${redirectUrl}`;
            window.location.href = loginUrl;
          }
        }}
        style={styles.enterButton}
      >
        {isAuthenticated ? '[ ENTER FIELD ]' : '[ SIGN IN ]'}
      </button>
    </div>
  );
}