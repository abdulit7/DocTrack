import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BRANDING_CONFIG } from './config/brandingConfig';

// Dynamically apply configured favicon if available
if (typeof document !== 'undefined' && BRANDING_CONFIG.faviconUrl) {
  const existingFavicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
  if (existingFavicon) {
    existingFavicon.href = BRANDING_CONFIG.faviconUrl;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

