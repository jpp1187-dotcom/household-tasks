import React, { useState, useEffect, useCallback } from 'react'
import { Mail, RefreshCw, Loader, ExternalLink } from 'lucide-react'
import { getProviderToken, fetchGmailUnreadCount, fetchGmailMessages } from '../lib/googleAuth'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Extract a readable sender name from a "From" header value
// e.g. "John Doe <john@example.com>" → "John Doe"
// e.g. "john@example.com" → "john"
function parseFrom(from) {
  if (!from) return '?'
  const named = from.match(/^"?([^"<]+)"?\s*</)
  if (named) return named[1].trim()
  return from.split('@')[0]
}

export default function GmailCard() {
  const [token,    setToken]    = useState(null)
  const [checked,  setChecked]  = useState(false) // true once token resolution is done
  const [unread,   setUnread]   = useState(null)
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Resolve token from Supabase session or localStorage on mount
  useEffect(() => {
    getProviderToken().then(t => {
      setToken(t ?? null)
      setChecked(true)
    })
  }, [])

  const fetchData = useCallback(async (accessToken) => {
    if (!accessToken) return
    setLoading(true)
    setError('')
    try {
      const [count, msgs] = await Promise.all([
        fetchGmailUnreadCount(accessToken),
        fetchGmailMessages(accessToken, 5),
      ])
      setUnread(count)
      setMessages(msgs)
    } catch (err) {
      if (err.message?.includes('expired')) {
        setToken(null)
        setError('Session expired — reconnect Google in the Agenda card.')
      } else {
        setError(err.message ?? 'Failed to load Gmail')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) fetchData(token)
  }, [token, fetchData])

  // Don't render at all if Google integration isn't configured
  if (!GOOGLE_CLIENT_ID) return null

  // Avoid flash while resolving token
  if (!checked) return null

  // ── Not connected ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="bg-white rounded-xl border border-sage-100 shadow-sm flex flex-col">
        <div className="px-5 pt-5 pb-3 border-b border-sage-50">
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide flex items-center gap-1.5">
            <Mail size={13} /> Gmail
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-8 gap-2 text-center">
          <Mail size={28} className="text-sage-200" />
          <p className="text-sm font-medium text-sage-600 max-w-[200px]">
            Connect Google via the Agenda card to enable Gmail preview
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    )
  }

  // ── Connected ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sage-50">
        <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide flex items-center gap-1.5">
          <Mail size={13} />
          Gmail
          {unread != null && unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ml-0.5">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
          {unread != null && (
            <span className="text-sage-300 font-normal normal-case tracking-normal">
              — {unread === 0 ? 'inbox zero 🎉' : `${unread} unread`}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchData(token)}
            disabled={loading}
            title="Refresh"
            className="p-1 text-sage-300 hover:text-sage-500 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Gmail"
            className="p-1 text-sage-300 hover:text-blue-500 transition-colors"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-3 min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={20} className="text-sage-300 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-xs text-red-400 py-6 text-center">{error}</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-sage-300 text-center">
            <p className="text-2xl mb-1">📭</p>
            <p className="text-sm">Inbox is empty!</p>
          </div>
        ) : (
          <ul className="divide-y divide-sage-50">
            {messages.map(msg => (
              <li key={msg.id} className="py-2.5 flex items-start gap-2">
                {/* Blue dot for unread */}
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${msg.isUnread ? 'bg-blue-500' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug truncate ${msg.isUnread ? 'font-semibold text-sage-800' : 'text-sage-600'}`}>
                    {msg.subject}
                  </p>
                  <p className="text-xs text-sage-400 mt-0.5 truncate">
                    {parseFrom(msg.from)}
                  </p>
                  {msg.snippet && (
                    <p className="text-xs text-sage-300 mt-0.5 truncate">{msg.snippet}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-sage-50">
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sage-400 hover:text-sage-600 transition-colors"
        >
          Open Gmail →
        </a>
      </div>
    </div>
  )
}
