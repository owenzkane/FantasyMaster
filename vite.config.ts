import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
// The same defineConfig as Vite's, plus the `test` section Vitest reads
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The '' asks for every variable in .env files, not only VITE_ ones. ESPN_S2 and ESPN_SWID
  // have no VITE_ prefix on purpose: they are read here, in the dev server, and never reach
  // the code that runs in the browser.
  const env = loadEnv(mode, process.cwd(), '')
  const cookie =
    env.ESPN_S2 && env.ESPN_SWID ? `espn_s2=${env.ESPN_S2}; SWID=${env.ESPN_SWID}` : null

  return {
    plugins: [react()],
    test: {
      // Runs before every test file
      setupFiles: ['./vitest.setup.ts'],
    },
    server: {
      proxy: {
        // Private ESPN leagues need my espn.com login cookies, which a web page isn't allowed
        // to attach to a request. The dev server can: requests to /espn-private/... are
        // forwarded to ESPN with the cookies added.
        '/espn-private': {
          target: 'https://lm-api-reads.fantasy.espn.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/espn-private/, ''),
          headers: { cookie: cookie ?? '' },
          configure: (proxy) => {
            // Lets the page tell "no cookies set up" apart from "ESPN rejected the cookies"
            proxy.on('proxyRes', (response) => {
              response.headers['x-espn-cookies'] = cookie ? 'set' : 'missing'
            })
          },
        },
      },
    },
  }
})
