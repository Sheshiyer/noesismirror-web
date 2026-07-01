import { API_URL } from '../config';

type DiagnosticLevel = 'error' | 'warn' | 'info';

interface ClientDiagnostic {
  level: DiagnosticLevel;
  message: string;
  detail?: Record<string, unknown>;
  path: string;
  timestamp: string;
  userAgent: string;
}

const STORAGE_KEY = 'noesis_diag_events';
const MAX_EVENTS = 30;
let installed = false;

function readStoredEvents(): ClientDiagnostic[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

function writeStoredEvents(events: ClientDiagnostic[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Storage can be unavailable in private browsing or locked-down contexts.
  }
}

function sendDiagnostic(event: ClientDiagnostic): void {
  const body = JSON.stringify(event);
  const url = `${API_URL}/client-events`;

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function recordClientDiagnostic(
  level: DiagnosticLevel,
  message: string,
  detail?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;

  const event: ClientDiagnostic = {
    level,
    message,
    detail,
    path: window.location.pathname + window.location.search,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  writeStoredEvents([...readStoredEvents(), event]);
  sendDiagnostic(event);
}

function errorDetail(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { value: String(error) };
}

export function installClientDiagnostics(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    recordClientDiagnostic('error', event.message || 'window error', {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      ...errorDetail(event.error),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    recordClientDiagnostic('error', 'unhandled promise rejection', errorDetail(event.reason));
  });
}
