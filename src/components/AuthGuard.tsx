import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%)',
    fontFamily: 'var(--noesis-font-body)',
    color: 'var(--noesis-parchment)',
    zIndex: 9998,
  },
  sigil: {
    width: '64px',
    height: 'auto',
    marginBottom: '1rem',
    opacity: 0.85,
    animation: 'khaBreath 3s infinite ease-in-out',
  },
  title: {
    fontFamily: 'var(--noesis-font-display)',
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.3rem',
    color: 'var(--noesis-gold)',
    textShadow: '0 0 18px rgba(197, 160, 23, 0.2)',
    marginBottom: '0.5rem',
  },
  message: {
    fontFamily: 'var(--noesis-font-body)',
    fontSize: '0.75rem',
    color: 'var(--noesis-silver)',
    marginTop: '0.5rem',
    textAlign: 'center',
    maxWidth: '400px',
    lineHeight: 1.6,
  },
  errorTitle: {
    fontFamily: 'var(--noesis-font-display)',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.2rem',
    color: 'var(--noesis-terracotta)',
    marginBottom: '0.5rem',
  },
  errorMessage: {
    fontFamily: 'var(--noesis-font-body)',
    fontSize: '0.7rem',
    color: 'var(--noesis-silver)',
    marginTop: '0.5rem',
  },
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, grants, error } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={styles.sigil}
        />
        <div style={styles.title}>AUTHENTICATING</div>
        <p style={styles.message}>
          Verifying access credentials...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={{ ...styles.sigil, opacity: 0.7, animation: 'none' }}
        />
        <div style={styles.errorTitle}>CONNECTION ERROR</div>
        <p style={styles.errorMessage}>{error.message}</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={{ ...styles.sigil, opacity: 0.7, animation: 'none' }}
        />
        <div style={styles.title}>ACCESS REQUIRED</div>
        <p style={styles.message}>
          Please authenticate to enter the field.
        </p>
          <button
            onClick={() => {
              // Navigate to protected page which triggers CF Access login on the same domain
              window.location.href = '/home';
            }}
            style={{
              ...styles.enterButton,
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              border: '1px solid var(--noesis-gold)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            [ AUTHENTICATE ]
          </button>
      </div>
    );
  }

  // Authenticated but no grants
  if (grants.length === 0) {
    return (
      <div style={styles.container}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={{ ...styles.sigil, opacity: 0.7, animation: 'none' }}
        />
        <div style={styles.title}>NO READINGS AVAILABLE</div>
        <p style={styles.message}>
          Your account has no granted readings. Contact support if you believe this is an error.
        </p>
      </div>
    );
  }

  // Authenticated with grants - render children
  return <>{children}</>;
}
