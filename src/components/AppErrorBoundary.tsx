import { Component, type ErrorInfo, type ReactNode } from 'react';
import { recordClientDiagnostic } from '../observability/clientDiagnostics';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    recordClientDiagnostic('error', error.message, {
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="home-container">
          <div className="brand-sigil-container">
            <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="brand-sigil" />
          </div>
          <div className="title" style={{ color: 'var(--noesis-terracotta)' }}>
            FIELD INTERRUPTED
          </div>
          <p className="auth-message">
            The field hit a runtime fault. The diagnostic trace has been sent.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
