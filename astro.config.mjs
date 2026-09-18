// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Default in Astro 7, set explicitly as documentation: every page is
  // prerendered unless it opts out with `export const prerender = false`.
  // The adapter below is what makes that opt-out possible.
  output: 'static',

  adapter: vercel({
    // We measure with GA4 through GTM; Vercel's script would be a second
    // analytics bundle for data we don't use.
    webAnalytics: { enabled: false },
    // Serve images through Vercel's optimizer in production.
    imageService: true,
  }),

  // React is only for the quiz island. Every other component is .astro.
  integrations: [react()],

  build: {
    // Inline small stylesheets, keep big ones as separate cacheable files.
    inlineStylesheets: 'auto',
  },
});
