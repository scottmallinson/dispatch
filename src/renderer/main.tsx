import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// The desktop window hides its title bar on macOS; the top bar makes room.
if (window.dispatch?.platform) document.documentElement.dataset.desktop = window.dispatch.platform;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
