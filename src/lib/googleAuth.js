/**
 * googleAuth.js — Google Workspace token management + API helpers
 *
 * Token flow:
 *   1. User clicks "Connect Google" in AgendaCard → Google OAuth popup
 *   2. @react-oauth/google returns access_token + expires_in
 *   3. writeToken() stores both in localStorage
 *   4. Any component calls readToken() to get a valid token
 *   5. Token used for Calendar (read-only) + Docs (create/write)
 *
 * Required env:  VITE_GOOGLE_CLIENT_ID
 * Required OAuth scopes (requested by AgendaCard):
 *   https://www.googleapis.com/auth/calendar.readonly
 *   https://www.googleapis.com/auth/documents
 */

const TOKEN_KEY  = 'gormbase_google_token'
const EXPIRY_KEY = 'gormbase_google_expiry'

// ── Token storage ─────────────────────────────────────────────────────────────

export function readToken() {
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    clearToken()
    return null
  }
  return localStorage.getItem(TOKEN_KEY) ?? null
}

export function writeToken(accessToken, expiresIn = 3600) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
}

export function isConnected() {
  return readToken() !== null
}

// ── Google Docs API ────────────────────────────────────────────────────────────

/**
 * createGoogleDoc — creates a new Google Doc with title + body text.
 *
 * @param {string} title      Document title
 * @param {string} bodyText   Plain text body (newlines preserved)
 * @param {string} accessToken  Google OAuth access token
 * @returns {Promise<string|null>} URL of the created doc, or null on failure
 */
export async function createGoogleDoc(title, bodyText, accessToken) {
  if (!accessToken) {
    console.error('[googleAuth] createGoogleDoc: no access token')
    return null
  }

  try {
    // Step 1 — create an empty doc
    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title || 'Shared Note' }),
    })

    if (createRes.status === 401) {
      clearToken()
      throw new Error('Google session expired — please reconnect.')
    }
    if (!createRes.ok) {
      const txt = await createRes.text()
      throw new Error(`Docs API ${createRes.status}: ${txt}`)
    }

    const { documentId } = await createRes.json()

    // Step 2 — insert text content via batchUpdate
    if (bodyText?.trim()) {
      const updateRes = await fetch(
        `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              insertText: {
                location: { index: 1 },
                text: bodyText,
              },
            }],
          }),
        }
      )
      if (!updateRes.ok) {
        // Non-fatal — doc was created, content just didn't insert
        const txt = await updateRes.text()
        console.warn('[googleAuth] batchUpdate warning:', txt)
      }
    }

    return `https://docs.google.com/document/d/${documentId}/edit`
  } catch (err) {
    console.error('[googleAuth] createGoogleDoc error:', err)
    throw err
  }
}

// ── Google Calendar API ───────────────────────────────────────────────────────

/**
 * fetchUpcomingEvents — returns the next N calendar events for primary calendar.
 *
 * @param {string} accessToken
 * @param {number} days         How many days ahead to look (default 7)
 * @param {number} maxResults   Max number of events (default 8)
 * @returns {Promise<object[]>} Array of Google Calendar event objects
 */
export async function fetchUpcomingEvents(accessToken, days = 7, maxResults = 8) {
  if (!accessToken) return []

  const now  = new Date().toISOString()
  const end  = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams({
    maxResults:   String(maxResults),
    orderBy:      'startTime',
    singleEvents: 'true',
    timeMin:      now,
    timeMax:      end,
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (res.status === 401) {
    clearToken()
    throw new Error('Google session expired')
  }
  if (!res.ok) throw new Error(`Google Calendar API ${res.status}`)

  const data = await res.json()
  return data.items ?? []
}

// ── Legacy stubs (kept for backward compat with CalendarPage) ─────────────────

const LOG = '[googleCalendar] Real OAuth not yet initiated in this session.'

export async function initGoogleAuth() {
  console.log(LOG)
  return readToken()
}

export async function createEvent(task) {
  console.log(LOG, 'createEvent task:', task?.id)
  return null
}

export async function updateEvent(task) {
  console.log(LOG, 'updateEvent task:', task?.id)
  return null
}

export async function deleteEvent(taskId) {
  console.log(LOG, 'deleteEvent taskId:', taskId)
  return null
}

export async function syncAllTasks(tasks) {
  console.log(LOG, `syncAllTasks: ${tasks?.length ?? 0} tasks`)
  return null
}
