import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

// Prefer the commit injected by CI (env), fall back to local git, then 'dev'.
// In the Docker build .git is excluded and git isn't installed, so the env var
// (set from github.sha via a build-arg) is what produces a real version there.
const gitCommit = (() => {
  const fromEnv = (process.env.VITE_GIT_COMMIT || '').trim();
  if (fromEnv) return fromEnv.substring(0, 7);
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; }
})();
const buildDate = (process.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0]).trim();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`${gitCommit} (${buildDate})`),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
