import react from '@vitejs/plugin-react'
// The same defineConfig as Vite's, plus the `test` section Vitest reads
import { defineConfig } from 'vitest/config'
import { apiRoutes } from './server/devApi.js'

// https://vite.dev/config/
export default defineConfig({
  // apiRoutes serves the server functions in api/ during `npm run dev`, as Vercel does when
  // the app is deployed. They connect ESPN accounts and fetch private ESPN leagues.
  plugins: [react(), apiRoutes()],
  test: {
    // Runs before every test file
    setupFiles: ['./vitest.setup.ts'],
  },
})
