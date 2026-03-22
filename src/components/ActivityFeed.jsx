import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useAuth } from '../contexts/AuthContext'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const ENTITY_ICONS = {
  task:      '✓',
  project:   '📋',
  household: '🏠',
  list:      '📝',
  profile:   '👤',
}

const FILTERS = ['all', 'task', 'project', 'household', 'list']

export default function ActivityFeed() {
  const { activity, refreshActivity } = useHouseholds()
  const { allUsers } = useAuth()
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const visible = filter === 'all'
    ? activity
    : activity.filter(a => a.entityType === filter)

  async function handleRefresh() {
    setRefreshing(true)
    await refreshActivity()
    setRefreshing(false)
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Activity</h2>
          <p className="text-xs text-sage-400 mt-1">{visible.length} event{visible.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-sage-400 hover:text-sage-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-lg font-medium capitalize transition-colors
              ${filter === f ? 'bg-sage-600 text-white' : 'text-sage-500 hover:bg-sage-100'}`}
          >
            {f === 'all' ? 'All' : f}s
          </button>
        ))}
      </div>

      {/* Feed */}
      {visible.length === 0 ? (
        <div className="text-center py-20 text-sage-300">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">No activity yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(a => {
            const user = allUsers.find(u => u.id === a.userId)
            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-sage-100 px-5 py-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5 shrink-0">
                    {user?.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover inline" />
                      : (user?.avatar ?? ENTITY_ICONS[a.entityType] ?? '•')
                    }
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-sage-800">{user?.name ?? 'Someone'}</span>
                      {' '}
                      <span className="text-sage-500">{a.action}</span>
                      {a.entityName && (
                        <>
                          {' '}
                          <span className="font-medium text-sage-700 truncate">{a.entityName}</span>
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-sage-400">{timeAgo(a.createdAt)}</span>
                      <span className="text-sage-200">·</span>
                      <span className="text-xs text-sage-400 capitalize">{a.entityType}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
