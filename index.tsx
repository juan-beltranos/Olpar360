
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- SERVICE WORKER REGISTRATION (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
      .catch(err => console.warn('Fallo al registrar Service Worker:', err));
  });
}

// --- NUCLEAR ERROR SUPPRESSION ---
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  try {
    const msg = args.map(a => {
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch(e) { return String(a); }
      }
      return String(a);
    }).join(' ').toLowerCase();

    if (
      msg.includes('quota') || 
      msg.includes('429') || 
      msg.includes('exceeded') || 
      msg.includes('resource_exhausted') ||
      msg.includes('gemini') ||
      msg.includes('googlegenai')
    ) {
      return; // SWALLOW THE ERROR
    }
  } catch (e) {
    return;
  }
  originalConsoleError.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason).toLowerCase();
  if (
    msg.includes('quota') || 
    msg.includes('429') || 
    msg.includes('exceeded') ||
    msg.includes('gemini')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

window.onerror = function(message, source, lineno, colno, error) {
  const msg = String(message).toLowerCase();
  if (
    msg.includes('quota') || 
    msg.includes('429') || 
    msg.includes('exceeded') ||
    msg.includes('script error')
  ) {
    return true;
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
