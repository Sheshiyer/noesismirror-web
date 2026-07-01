import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import WorldPage from './components/WorldPage';
import { TokenHandler } from './components/TokenHandler';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { installClientDiagnostics } from './observability/clientDiagnostics';

installClientDiagnostics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <TokenHandler />
        <Routes>
          {/* Unified home page with auth built-in */}
          <Route path="/" element={<Home />} />

          {/* World page - renders the 3D experience */}
          <Route path="/p/:personId" element={<WorldPage />} />

          {/* Dashboard - redirect to home for now */}
          <Route path="/home" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>
);
