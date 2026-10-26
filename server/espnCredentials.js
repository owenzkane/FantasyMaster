// @ts-check
// The two ESPN login values, kept in the visitor's own browser as cookies on this site.
//
// They are HttpOnly (the page's JavaScript can't read them), SameSite=Strict (the browser only
// sends them on requests that start on this site) and, over HTTPS, Secure. The server never
// writes them anywhere else: each request brings them, and they're used for that request only.
//
// Plain JavaScript with type checking from the JSDoc comments, so a host like Vercel can run it
// as it is, with no build step.

const S2_COOKIE = 'fm_espn_s2'
const SWID_COOKIE = 'fm_espn_swid'
// Only requests to our own API carry them; the rest of the site never sees them
const COOKIE_PATH = '/api'
// "Connected" lasts until the visitor disconnects, with a one-year ceiling. ESPN's own login
// usually ends sooner (signing out of ESPN does it), and then ESPN refuses the values.
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

/** @typedef {{ s2: string, swid: string }} EspnCredentials */

/**
 * The visitor's stored ESPN values, or null when they haven't connected.
 * @param {Request} request
 * @returns {EspnCredentials | null}
 */
export function readCredentials(request) {
  const cookies = Object.fromEntries(
    (request.headers.get('cookie') ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const equals = part.indexOf('=')
        return equals === -1 ? [part, ''] : [part.slice(0, equals), part.slice(equals + 1)]
      }),
  )
  const s2 = cookies[S2_COOKIE]
  const swid = cookies[SWID_COOKIE]
  return s2 && swid ? { s2, swid } : null
}

/**
 * Checks the two pasted values look like ESPN's, and tidies them. Returns a message for the
 * visitor when they don't.
 * @param {unknown} s2
 * @param {unknown} swid
 * @returns {{ ok: true, credentials: EspnCredentials } | { ok: false, message: string }}
 */
export function checkCredentials(s2, swid) {
  const cleanS2 = typeof s2 === 'string' ? s2.trim().replace(/^"|"$/g, '') : ''
  let cleanSwid = typeof swid === 'string' ? swid.trim().replace(/^"|"$/g, '') : ''
  // People often copy the ID without its curly braces
  if (/^[0-9a-f-]{36}$/i.test(cleanSwid)) cleanSwid = `{${cleanSwid}}`

  if (!/^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i.test(cleanSwid)) {
    return {
      ok: false,
      message: 'That SWID doesn’t look right. It should look like {6BCF5F16-6913-4192-B4CE-A36F2B0C3F02}.',
    }
  }
  // espn_s2 is a long run of letters, digits and %, +, / or = signs
  if (!/^[A-Za-z0-9%+/=._-]{40,2000}$/.test(cleanS2)) {
    return {
      ok: false,
      message: 'That espn_s2 doesn’t look right. It’s a long string of letters, numbers and % signs.',
    }
  }
  return { ok: true, credentials: { s2: cleanS2, swid: cleanSwid } }
}

/**
 * The Set-Cookie headers that store the values, or clear them when `credentials` is null.
 * @param {Request} request
 * @param {EspnCredentials | null} credentials
 * @returns {string[]}
 */
export function credentialCookies(request, credentials) {
  // Browsers drop Secure cookies sent over plain HTTP, which is how the local dev server runs
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  const settings = `Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict${secure}`
  if (!credentials) {
    return [S2_COOKIE, SWID_COOKIE].map((name) => `${name}=; ${settings}; Max-Age=0`)
  }
  return [
    `${S2_COOKIE}=${credentials.s2}; ${settings}; Max-Age=${ONE_YEAR_SECONDS}`,
    `${SWID_COOKIE}=${credentials.swid}; ${settings}; Max-Age=${ONE_YEAR_SECONDS}`,
  ]
}

/**
 * True when a request that changes something came from a page on this same site. Stops another
 * website from connecting or disconnecting a visitor behind their back.
 * @param {Request} request
 */
export function fromThisSite(request) {
  const origin = request.headers.get('origin')
  return origin !== null && origin === new URL(request.url).origin
}
