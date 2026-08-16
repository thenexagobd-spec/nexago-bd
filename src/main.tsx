import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// @ts-expect-error Vite supports query-qualified local modules for cache invalidation.
import App from './App.tsx?v=pos-receipt-barcode-qr-20260804';
import LegalView from './components/LegalView';
import { LEGAL_DOCS } from './legalContent';
import './index.css';

const legalParam = new URLSearchParams(window.location.search).get('legal');
const legalDoc = legalParam === 'privacy' || legalParam === 'terms' ? LEGAL_DOCS[legalParam] : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {legalDoc ? <LegalView doc={legalDoc} /> : <App />}
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalDev) {
    void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister())));
    if ('caches' in window) void caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nexago-shell-')).map(key => caches.delete(key))));
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // offline support unavailable
      });
    });
  }
}
