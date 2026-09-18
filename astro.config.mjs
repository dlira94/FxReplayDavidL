// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
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

  // Preact for the quiz island; every other component is .astro and ships no
  // JavaScript at all. `compat: true` aliases react/react-dom to preact/compat,
  // so the island is written as ordinary React and imports from 'react' —
  // moving back to React later is a config change, not a rewrite (D29).
  integrations: [preact({ compat: true })],

  build: {
    // Inline small stylesheets, keep big ones as separate cacheable files.
    inlineStylesheets: 'auto',
  },
});
