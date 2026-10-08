// The one place that decides which platform the app uses.

import { mockPlatform } from './mock/mockPlatform.ts'
import { sleeperPlatform } from './sleeper/sleeperPlatform.ts'
import type { FantasyPlatform } from './types.ts'

// Set by `npm run dev:mock`, or by VITE_USE_MOCK=true in a .env.local file
export const platform: FantasyPlatform =
  import.meta.env.VITE_USE_MOCK === 'true' ? mockPlatform : sleeperPlatform
