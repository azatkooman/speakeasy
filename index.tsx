
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="color:red; padding: 20px;">Error: Root element not found.</div>';
  throw new Error("Could not find root element to mount to");
}

try {
  let root = (rootElement as any)._reactRootContainer;
  if (!root) {
    root = createRoot(rootElement);
    (rootElement as any)._reactRootContainer = root;
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to render app:", error);
  rootElement.innerHTML = `
    <div style="color:red; padding: 20px; font-family: sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load application.</p>
      <pre style="background: #eee; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.message + '\n' + error.stack : String(error)}</pre>
    </div>
  `;
}
