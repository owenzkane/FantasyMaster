import type { EspnProblem } from '../types.ts'

// What to tell the user when an ESPN league can't be read
export function describeEspnProblem(problem: EspnProblem) {
  switch (problem) {
    case 'notFound':
      return 'No ESPN league with that ID.'
    case 'privateNoProxy':
      return 'This league is private, and this copy of the app can’t open private leagues.'
    case 'privateNoCookies':
      return 'This league is private. Connect your ESPN account to add it.'
    case 'privateRejected':
      return 'This league is private and ESPN didn’t accept your saved login. It may have expired, or your account isn’t in this league. Connect again with fresh values.'
  }
}

// True for the problems that connecting (or reconnecting) an ESPN account can fix
export function needsEspnLogin(problem: EspnProblem) {
  return problem === 'privateNoCookies' || problem === 'privateRejected'
}
