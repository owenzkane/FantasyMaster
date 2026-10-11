import type { EspnProblem } from '../types.ts'

// What to tell the user when an ESPN league can't be read
export function describeEspnProblem(problem: EspnProblem) {
  switch (problem) {
    case 'notFound':
      return 'No ESPN league with that ID.'
    case 'privateNoProxy':
      return 'This league is private. Private leagues only work when the app is run with `npm run dev`.'
    case 'privateNoCookies':
      return 'This league is private and no ESPN login cookies are set up. Add ESPN_S2 and ESPN_SWID to .env.local (see NOTES.md), then restart `npm run dev`.'
    case 'privateRejected':
      return 'This league is private and ESPN rejected the saved login cookies. They may have expired, or that account isn’t in the league. Update ESPN_S2 and ESPN_SWID in .env.local, then restart `npm run dev`.'
  }
}
