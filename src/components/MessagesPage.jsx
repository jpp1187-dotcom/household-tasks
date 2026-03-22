import React, { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, isToday } from 'date-fns'

/**
 * MessagesPage — real-time 1:1 messaging via Supabase Realtime.
 *
 * Required SQL:
 * CREATE TABLE IF NOT EXISTS messages (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   sender_id uuid REFERENCES auth.users(id),
 *   recipient_id uuid REFERENCES auth.users(id),
 *   content text NOT NULL,
 *   read boolean DEFAULT false,
 *   created_at timestamptz DEFAULT now()
 * );
 * CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages(recipient_id);
 * ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users see own messages" ON messages
 *   FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
 * CREATE POLICY "Users send messages" ON messages
 *   FOR INSERT WITH CHECK (auth.uid() = sender_id);
 * CREATE POLICY "Users mark read" ON messages
 *   FOR UPDATE USING (auth.uid() = recipient_id);
 */

function formatMsgTime(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isToday(d)) return format(d, 'h:mma').replace('AM', 'am').replace('PM', 'pm')
  return format(d, 'MMM d h:mma').replace('AM', 'am').replace('PM', 'pm')
}

function AvatarCircle({ user, size = 8 }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        style={{ width: size * 4, height: size * 4, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const initials = (user?.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = (user?.name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const px = size * 4
  return (
    <div
      style={{ width: px, height: px, borderRadius: '50%', backgroundColor: `hsl(${hue}, 45%, 48%)`, flexShrink: 0 }}
      className="flex items-center justify-center text-xs font-semibold text-white"
    >
      {initials}
    </div>
  )
}

export default function MessagesPage() {
  const { currentUser, allUsers } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)
  const [activeConversation, setActiveConversation] = useState(null) // userId | null
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!currentUser?.id) return

    supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            setDbError('Messages table not found. Run the messages SQL migration to enable messaging.')
          } else {
            setDbError(error.message)
          }
        } else {
          setMessages(data ?? [])
        }
        setLoading(false)
      })

    channelRef.current = supabase.channel('messages-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${currentUser.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [currentUser?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation, messages.length])

  useEffect(() => {
    if (!activeConversation || !currentUser?.id) return
    supabase.from('messages')
      .update({ read: true })
      .eq('sender_id', activeConversation)
      .eq('recipient_id', currentUser.id)
      .eq('read', false)
      .then(() => {
        setMessages(prev => prev.map(m =>
          m.sender_id === activeConversation && m.recipient_id === currentUser.id
            ? { ...m, read: true }
            : m
        ))
      })
  }, [activeConversation])

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversation || sending) return
    setSending(true)
    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      recipient_id: activeConversation,
      content: newMessage.trim(),
    }).select().single()
    if (!error && data) setMessages(prev => [...prev, data])
    setNewMessage('')
    setSending(false)
  }

  if (loading) return <div className="p-8 text-sage-400 text-sm">Loading…</div>

  if (dbError) {
    return (
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        <h2 className="font-display text-2xl text-sage-800 mb-4">Messages</h2>
        <div className="bg-clay-50 border border-clay-200 rounded-xl p-5 text-sm text-clay-700 max-w-lg">
          <p className="font-semibold mb-2">⚠️ Setup required</p>
          <p>{dbError}</p>
        </div>
      </div>
    )
  }

  const otherUsers = allUsers.filter(u => u.id !== currentUser?.id)
  const conversations = otherUsers.map(u => {
    const thread = messages.filter(m =>
      (m.sender_id === currentUser.id && m.recipient_id === u.id) ||
      (m.sender_id === u.id && m.recipient_id === currentUser.id)
    )
    const unread = thread.filter(m => m.sender_id === u.id && !m.read).length
    const last = thread[thread.length - 1]
    return { user: u, thread, unread, last }
  })

  const selectedUser = allUsers.find(u => u.id === activeConversation)
  const activeThread = activeConversation
    ? messages.filter(m =>
        (m.sender_id === currentUser.id && m.recipient_id === activeConversation) ||
        (m.sender_id === activeConversation && m.recipient_id === currentUser.id)
      )
    : []

  // ── Conversation list panel ──────────────────────────────────────────────────
  const ConversationList = (
    <div
      style={{ width: 260, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #e8f0e8', background: '#fff', display: 'flex', flexDirection: 'column' }}
      className="md:flex"
    >
      <div className="px-5 pt-6 pb-4 border-b border-sage-100 shrink-0">
        <h2 className="font-display text-lg text-sage-800 flex items-center gap-2">
          <MessageSquare size={18} /> Messages
        </h2>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 8 }}>
        {conversations.map(({ user: u, unread, last }) => (
          <button
            key={u.id}
            onClick={() => setActiveConversation(u.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
              ${activeConversation === u.id ? 'bg-sage-100' : 'hover:bg-sage-50'}`}
          >
            <AvatarCircle user={u} size={9} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sage-800 truncate">{u.name ?? u.email}</p>
              {last && (
                <p className="text-xs text-sage-400 truncate">
                  {last.sender_id === currentUser.id ? 'You: ' : ''}{last.content}
                </p>
              )}
            </div>
            {unread > 0 && (
              <span className="text-xs bg-sage-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-semibold">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // ── Chat panel ───────────────────────────────────────────────────────────────
  const ChatPanel = selectedUser ? (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #e8f0e8', background: '#fff' }}
        className="px-4 md:px-6 py-3 flex items-center gap-3">
        {/* Back arrow — mobile only */}
        <button
          onClick={() => setActiveConversation(null)}
          className="md:hidden text-sage-400 hover:text-sage-600 p-1 -ml-1"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ width: 32, height: 32, flexShrink: 0 }}>
          <AvatarCircle user={selectedUser} size={8} />
        </div>
        <div>
          <p className="text-sm font-semibold text-sage-800">{selectedUser.name ?? selectedUser.email}</p>
          <p className="text-xs text-sage-400 capitalize">{selectedUser.role}</p>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#f8faf8' }}>
        {activeThread.length === 0 && (
          <p className="text-center text-xs text-sage-300 py-10">Start the conversation!</p>
        )}
        <div className="space-y-3">
          {activeThread.map(m => {
            const isMine = m.sender_id === currentUser.id
            return (
              <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                {!isMine && <AvatarCircle user={selectedUser} size={7} />}
                <div className={`max-w-xs sm:max-w-sm ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${isMine
                      ? 'bg-sage-600 text-white rounded-br-md'
                      : 'bg-white border border-sage-100 text-sage-800 rounded-bl-md shadow-sm'}`}>
                    {m.content}
                  </div>
                  <p className="text-xs text-sage-400 mt-1 px-1">{formatMsgTime(m.created_at)}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={sendMessage}
        style={{ flexShrink: 0, borderTop: '1px solid #e8f0e8', background: '#fff' }}
        className="px-4 py-3 flex items-center gap-2"
      >
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
          placeholder={`Message ${selectedUser.name ?? selectedUser.email}…`}
          className="flex-1 border border-sage-200 bg-sage-50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
          className="bg-sage-600 text-white flex items-center justify-center hover:bg-sage-700 disabled:opacity-40 transition-colors"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  ) : (
    // Empty state — desktop only
    <div className="hidden md:flex flex-1 items-center justify-center text-sage-300">
      <div className="text-center">
        <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Select a conversation</p>
      </div>
    </div>
  )

  return (
    // Root: flex, fixed height, no overflow
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Mobile: show list OR chat. Desktop: show both side-by-side */}
      {/* Conversation list: visible on desktop always; on mobile only when no activeConversation */}
      <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} flex-col`}
        style={{ width: 260, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #e8f0e8', background: '#fff' }}>
        <div className="px-5 pt-6 pb-4 border-b border-sage-100 shrink-0">
          <h2 className="font-display text-lg text-sage-800 flex items-center gap-2">
            <MessageSquare size={18} /> Messages
          </h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 8 }}>
          {conversations.map(({ user: u, unread, last }) => (
            <button
              key={u.id}
              onClick={() => setActiveConversation(u.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
                ${activeConversation === u.id ? 'bg-sage-100' : 'hover:bg-sage-50'}`}
            >
              <AvatarCircle user={u} size={9} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sage-800 truncate">{u.name ?? u.email}</p>
                {last && (
                  <p className="text-xs text-sage-400 truncate">
                    {last.sender_id === currentUser.id ? 'You: ' : ''}{last.content}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <span className="text-xs bg-sage-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-semibold">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel: visible on desktop always; on mobile only when activeConversation is set */}
      <div className={`${activeConversation ? 'flex' : 'hidden md:flex'}`}
        style={{ flex: 1, minWidth: 0, flexDirection: 'column', overflow: 'hidden', display: activeConversation ? 'flex' : undefined }}>
        {ChatPanel}
      </div>
    </div>
  )
}
