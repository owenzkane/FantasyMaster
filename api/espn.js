// @ts-check
// Vercel runs each file in api/ as a server function at the matching address: this one is
// /api/espn. An exported GET handles GET requests. The logic lives in server/.
import { proxyEspn } from '../server/espnProxy.js'

/** @param {Request} request */
export function GET(request) {
  return proxyEspn(request)
}
