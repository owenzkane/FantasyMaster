// @ts-check
// Vercel serves this at /api/espn-login, one handler per HTTP method. The logic lives in server/.
import { connect, connectionStatus, disconnect } from '../server/espnLogin.js'

/** @param {Request} request */
export function GET(request) {
  return connectionStatus(request)
}

/** @param {Request} request */
export function POST(request) {
  return connect(request)
}

/** @param {Request} request */
export function DELETE(request) {
  return disconnect(request)
}
