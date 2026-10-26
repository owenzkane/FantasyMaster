// @ts-check
// Runs the files in api/ inside `npm run dev`, the way Vercel runs them when deployed, so the
// app behaves the same locally. Vite's dev server speaks Node's own request objects; this turns
// them into the web-standard Request and Response the handlers use, and back.

import * as espn from '../api/espn.js'
import * as espnLogin from '../api/espn-login.js'

/** @type {Record<string, Record<string, (request: Request) => Response | Promise<Response>>>} */
const ROUTES = { '/api/espn': espn, '/api/espn-login': espnLogin }

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<Request>}
 */
async function toRequest(req) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    else if (Array.isArray(value)) value.forEach((item) => headers.append(name, item))
  }
  const method = req.method ?? 'GET'
  /** @type {Buffer[]} */
  const chunks = []
  if (method !== 'GET' && method !== 'HEAD') {
    for await (const chunk of req) chunks.push(chunk)
  }
  return new Request(url, {
    method,
    headers,
    body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
  })
}

/**
 * @param {Response} response
 * @param {import('node:http').ServerResponse} res
 */
async function sendResponse(response, res) {
  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') res.setHeader(name, value)
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)
  res.end(Buffer.from(await response.arrayBuffer()))
}

/** @returns {import('vite').Plugin} */
export function apiRoutes() {
  return {
    name: 'fantasymaster-api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        const route = ROUTES[path]
        if (!route) return next()
        const handler = route[req.method ?? 'GET']
        if (!handler) {
          res.statusCode = 405
          return res.end()
        }
        try {
          await sendResponse(await handler(await toRequest(req)), res)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
