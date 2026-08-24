import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      /*
       * No `define` for an API key here, deliberately.
       *
       * This used to inline GEMINI_API_KEY into anything referencing
       * process.env.API_KEY. Nothing referenced it, so the key never actually
       * reached the bundle — but it was one import away from shipping a static
       * credential inside a web bundle and an Android package, where it can be
       * read straight out of the artifact. A client-side key is not
       * authentication.
       *
       * If image labelling comes back, it belongs behind an authenticated
       * server endpoint with rate limits, explicit consent before a child's
       * photo leaves the device, a stated retention policy, and a non-AI
       * fallback so the feature failing never blocks making a card.
       */
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
