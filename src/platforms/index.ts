// The one place that decides whether the app talks to the real services or the mock.

import { espnAccount as realEspnAccount } from './espn/espnAccount.ts'
import { espnPlatform } from './espn/espnPlatform.ts'
import { mockEspn, mockEspnAccount, mockSleeper } from './mock/mockPlatform.ts'
import { sleeperPlatform } from './sleeper/sleeperPlatform.ts'
import type {
  EspnAccount,
  EspnSource,
  FantasyPlatform,
  League,
  NflSource,
  SleeperSource,
} from './types.ts'

// Set by `npm run dev:mock`, or by VITE_USE_MOCK=true in a .env.local file
export const usingMock = import.meta.env.VITE_USE_MOCK === 'true'

export const sleeper: SleeperSource = usingMock ? mockSleeper : sleeperPlatform
export const espn: EspnSource = usingMock ? mockEspn : espnPlatform
export const espnAccount: EspnAccount = usingMock ? mockEspnAccount : realEspnAccount

// Sleeper doubles as our source of NFL-wide facts: the current week, player names and stats
export const nfl: NflSource = sleeper

export function platformFor(league: League): FantasyPlatform {
  return league.platform === 'espn' ? espn : sleeper
}
