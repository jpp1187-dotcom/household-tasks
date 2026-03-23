import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, RefreshCw, ExternalLink, Loader, LogOut } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { getProviderToken, writeToken, clearToken } from '../lib/googleAuth'

// ── Event date formatter ─────────────────────────────────────────────────────
function fmtEvent(event) {
  const start = event.start?.dateTime || event.start?.date
  if (!start) return ''
  const d = new Date(start)
  const now  = new Date()
  const tom  = new Date(now); tom.setDate(tom.getDate() + 1)
  const day =
    d.toDateString() === now.toDateString()  ? 'Today' :
    d.toDateString() === tom.toDateString()  ? 'Tomorrow' :
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = event.start?.dateTime
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''
  return time ? `${day} · ${time}` : day
}

// ── Google calendar logo as inline SVG ──────────────────────────────────────
function GCalIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 2h-1V0h-2v2H9V0H7v2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V8h12v12zm0-14H6V4h12v2z" fill="#4285F4"/>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Calendar + Docs + Gmail — all three scopes requested up front so the popup
// also covers GmailCard and SharedNotes export without a second consent screen.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

export default function AgendaCard({ navigate }) {
  const [token,        setToken]        = useState(null)
  const [tokenChecked, setTokenChecked] = useState(false)
  const [events,       setEvents]       = useState([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  // On mount: check Supabase session first, then fall back to localStorage cache
  useEffect(() => {
    getProviderToken().then(t => {
      setToken(t ?? null)
      setTokenChecked(true)
    })
  }, [])

  // Google OAuth popup — fallback for email/password users who haven't
  // signed in with Google. Requests all three scopes in one shot.
  const loginGoogle = useGoogleLogin({
    scope: SCOPES,
    onSuccess: (res) => {
      writeToken(res.access_token, res.expires_in ?? 3600)
      setToken(res.access_token)
      setError('')
    },
    onError: (err) => {
      console.error('[AgendaCard] Google login error:', err)
      setError('Google sign-in failed — check your Client ID and allowed origins.')
    },
  })

  function handleDisconnect() {
    clearToken()
    setToken(null)
    setEvents([])
    setError('')
  }

  const fetchEvents = useCallback(async (accessToken) => {
    if (!accessToken) return
    setLoading(true)
    setError('')
    try {
      const now  = new Date().toISOString()
      const week = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const params = new URLSearchParams({
        maxResults:    '8',
        orderBy:       'startTime',
        singleEvents:  'true',
        timeMin:       now,
        timeMax:       week,
      })
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (res.status === 401) {
        clearToken()
        setToken(null)
        setError('Session expired — reconnect to refresh.')
        return
      }
      if (!res.ok) throw new Error(`Google Calendar API ${res.status}`)
      const data = await res.json()
      setEvents(data.items ?? [])
    } catch (err) {
      setError(err.message ?? 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) fetchEvents(token)
  }, [token, fetchEvents])

  // ── Not configured ──────────────────────────────────────────────────────────
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <GCalIcon /> Google Agenda
        </p>
        <p className="text-xs text-sage-400">
          Add <code className="font-mono bg-sage-50 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to{' '}
          <code className="font-mono bg-sage-50 px-1 rounded">.env.local</code> to enable Calendar sync.{' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            Create credentials →
          </a>
        </p>
      </div>
    )
  }

  // While resolving the token from session/localStorage, show nothing (avoid flash)
  if (!tokenChecked) return null

  // ── Not connected ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="bg-white rounded-xl border border-sage-100 shadow-sm flex flex-col">
        <div className="px-5 pt-5 pb-3 border-b border-sage-50">
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide flex items-center gap-1.5">
            <GCalIcon /> Google Agenda
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-8 gap-3 text-center">
          <Calendar size={28} className="text-sage-200" />
          <div>
            <p className="text-sm font-medium text-sage-700 mb-1">Connect Google Calendar</p>
            <p className="text-xs text-sage-400">See your upcoming events right on the dashboard</p>
          </div>
          {error && <p className="text-xs text-red-500 max-w-xs">{error}</p>}
          <button
            onClick={() => loginGoogle()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <GCalIcon size={16} />
            Connect Google
          </button>
          <p className="text-xs text-sage-300">Also enables Gmail preview and "Send to Google Docs"</p>
        </div>
      </div>
    )
  }

  // ── Connected ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sage-50">
        <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide flex items-center gap-1.5">
          <GCalIcon /> Google Agenda
          <span className="text-sage-300 font-normal normal-case tracking-normal">— next 7 days</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchEvents(token)}
            disabled={loading}
            title="Refresh"
            className="p-1 text-sage-300 hover:text-sage-500 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDisconnect}
            title="Disconnect Google"
            className="p-1 text-sage-300 hover:text-red-400 transition-colors"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-3 min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={20} className="text-sage-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => loginGoogle()}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              Reconnect Google
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-sage-300 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm">Nothing on the calendar this week!</p>
          </div>
        ) : (
          <ul className="divide-y divide-sage-50">
            {events.map(evt => (
              <li key={evt.id} className="py-2.5 flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sage-800 leading-snug truncate">
                    {evt.summary ?? '(No title)'}
                  </p>
                  <p className="text-xs text-sage-400 mt-0.5">{fmtEvent(evt)}</p>
                </div>
                {evt.htmlLink && (
                  <a
                    href={evt.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sage-300 hover:text-blue-500 transition-colors mt-0.5"
                    title="Open in Google Calendar"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer link */}
      <div className="px-5 py-3 border-t border-sage-50">
        <button
          onClick={() => navigate?.('calendar')}
          className="text-xs text-sage-400 hover:text-sage-600 transition-colors"
        >
          View full calendar →
        </button>
      </div>
    </div>
  )
}
