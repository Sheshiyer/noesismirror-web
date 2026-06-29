import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import WorldPage from './components/WorldPage';
import AuthenticatedHome from './components/AuthenticatedHome';
import { AuthGuard } from './components/AuthGuard';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Home />} />
        
        {/* Authenticated home - shows grants selection or auto-redirects */}
        <Route
          path="/home"
          element={
            <AuthGuard>
              <AuthenticatedHome />
            </AuthGuard>
          }
        />
        
        {/* World page - protected by AuthGuard */}
        <Route
          path="/p/:personId"
          element={
            <AuthGuard>
              <WorldPage />
            </AuthGuard>
          }
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
