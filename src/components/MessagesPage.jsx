import React, { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
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
 */

function formatMsgTime(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isToday(d)) return format(d, 'h:mma').replace('AM', 'am').replace('PM', 'pm')
  return format(d, 'MMM d h:mma').replace('AM', 'am').replace('PM', 'pm')
}

function AvatarCircle({ user, size = 8 }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
  }
  const initials = (user?.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = (user?.name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0`}
      style={{ backgroundColor: `hsl(${hue}, 45%, 48%)` }}>
      {initials}
    </div>
  )
}

export default function MessagesPage() {
  const { currentUser, allUsers } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  // Load all messages involving current user
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

    // Realtime subscription
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

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [currentUser?.id])

  // Scroll to bottom when conversation changes or new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedUserId, messages.length])

  // Mark messages as read when conversation opened
  useEffect(() => {
    if (!selectedUserId || !currentUser?.id) return
    supabase.from('messages')
      .update({ read: true })
      .eq('sender_id', selectedUserId)
      .eq('recipient_id', currentUser.id)
      .eq('read', false)
      .then(() => {
        setMessages(prev => prev.map(m =>
          m.sender_id === selectedUserId && m.recipient_id === currentUser.id
            ? { ...m, read: true }
            : m
        ))
      })
  }, [selectedUserId])

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUserId || sending) return
    setSending(true)
    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      recipient_id: selectedUserId,
      content: newMessage.trim(),
    }).select().single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
    }
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

  // Build conversation list: distinct users I've messaged or who've messaged me
  const otherUsers = allUsers.filter(u => u.id !== currentUser?.id)
  const conversations = otherUsers.map(u => {
    const thread = messages.filter(m =>
      (m.sender_id === currentUser.id && m.recipient_id === u.id) ||
      (m.sender_id === u.id && m.recipient_id === currentUser.id)
    )
    const unread = thread.filter(m => m.sender_id === u.id && !m.read).length
    const last = thread[thread.length - 1]
    return { user: u, thread, unread, last }
  }).filter(c => c.thread.length > 0 || true) // show all users so you can start a convo

  const selectedUser = allUsers.find(u => u.id === selectedUserId)
  const activeThread = selectedUserId
    ? messages.filter(m =>
        (m.sender_id === currentUser.id && m.recipient_id === selectedUserId) ||
        (m.sender_id === selectedUserId && m.recipient_id === currentUser.id)
      )
    : []

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel — conversation list */}
      <div className="w-64 shrink-0 border-r border-sage-100 bg-white flex flex-col">
        <div className="px-5 pt-6 pb-4 border-b border-sage-100">
          <h2 className="font-display text-lg text-sage-800 flex items-center gap-2">
            <MessageSquare size={18} /> Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.map(({ user: u, unread, last }) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
                ${selectedUserId === u.id ? 'bg-sage-100' : 'hover:bg-sage-50'}`}
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

      {/* Right panel — thread */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="px-6 py-4 border-b border-sage-100 bg-white flex items-center gap-3">
            <AvatarCircle user={selectedUser} size={8} />
            <div>
              <p className="text-sm font-semibold text-sage-800">{selectedUser.name ?? selectedUser.email}</p>
              <p className="text-xs text-sage-400 capitalize">{selectedUser.role}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {activeThread.length === 0 && (
              <p className="text-center text-xs text-sage-300 py-10">Start the conversation!</p>
            )}
            {activeThread.map(m => {
              const isMine = m.sender_id === currentUser.id
              return (
                <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isMine && <AvatarCircle user={selectedUser} size={7} />}
                  <div className={`max-w-sm ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${isMine ? 'bg-sage-600 text-white rounded-br-md' : 'bg-white border border-sage-100 text-sage-800 rounded-bl-md shadow-sm'}`}>
                      {m.content}
                    </div>
                    <p className="text-xs text-sage-400 mt-1 px-1">{formatMsgTime(m.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <form onSubmit={sendMessage} className="px-6 py-4 border-t border-sage-100 bg-white flex gap-3">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
              placeholder={`Message ${selectedUser.name ?? selectedUser.email}…`}
              className="flex-1 border border-sage-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
            <button type="submit" disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-40 transition-colors shrink-0">
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sage-300">
          <div className="text-center">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}
