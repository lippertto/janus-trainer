import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.tsx', '**/*.test.ts'],
    exclude: ['playwright/**', 'node_modules/**', '.next/**', 'api-tests/**'],
    server: {
      deps: {
        // @mui/material imports `react-transition-group/TransitionGroupContext`
        // as a bare ESM path. The package only exposes that subpath via a
        // legacy nested package.json (no `exports` field), which Node's native
        // ESM resolver rejects. Inlining sends @mui/material through Vite's
        // resolver, which handles the legacy directory specifier.
        // Note: regex matches full file paths, not package names.
        // See https://github.com/mui/material-ui/issues/46586
        inline: [/node_modules\/@mui\//],
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@/',
        replacement: fileURLToPath(new URL('./', import.meta.url)),
      },
    ],
  },
});
