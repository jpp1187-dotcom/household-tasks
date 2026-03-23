import React, { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { X, Calendar as CalendarIcon } from 'lucide-react'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })
const DnDCalendar = withDragAndDrop(Calendar)

// List name → calendar color mapping
const LIST_COLOR_MAP = {
  'Housing':           { bg: '#22c55e', text: '#fff' },
  'Clinical':          { bg: '#3b82f6', text: '#fff' },
  'Behavioral Health': { bg: '#14b8a6', text: '#fff' },
  'Justice':           { bg: '#f97316', text: '#fff' },
  'Care Coordination': { bg: '#6366f1', text: '#fff' },
  'Benefits':          { bg: '#a855f7', text: '#fff' },
}
const DEFAULT_COLOR = { bg: '#94a3b8', text: '#fff' }

function GoogleCalModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-sage-800 flex items-center gap-2">
            <CalendarIcon size={20} className="text-blue-500" />
            Connect Google Calendar
          </h3>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-sage-600 mb-4">
          Google Calendar sync will be available in a future version of GormBase.
          When enabled, all tasks with due dates will automatically appear in your
          Google Calendar, and changes made in either app will sync in real time.
        </p>
        <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 text-xs text-sage-500 mb-5">
          <p className="font-semibold mb-1">What's being built:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>OAuth 2.0 integration with Google Identity Services</li>
            <li>Bi-directional sync via Google Calendar API v3</li>
            <li>Per-user calendar selection and permission scoping</li>
            <li>Webhook-based push notifications for real-time updates</li>
          </ul>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { tasks, lists, updateTask } = useTasks()
  const { residents, households } = useHouseholds()
  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())
  const [residentFilter, setResidentFilter] = useState('')
  const [householdFilter, setHouseholdFilter] = useState('')
  const [showGoogleModal, setShowGoogleModal] = useState(false)

  // Map tasks with due dates to calendar events
  const events = useMemo(() => {
    return tasks
      .filter(t => t.dueDate && !t.archived)
      .filter(t => {
        if (residentFilter  && t.residentId  !== residentFilter)  return false
        if (householdFilter && t.householdId !== householdFilter) return false
        return true
      })
      .map(t => {
        const d = new Date(t.dueDate + 'T12:00:00')
        const list = lists.find(l => l.id === t.listId)
        return {
          id: t.id,
          title: t.title,
          start: d,
          end: d,
          allDay: true,
          resource: { task: t, listName: list?.name ?? null },
        }
      })
  }, [tasks, lists, residentFilter, householdFilter])

  function eventPropGetter(event) {
    const colors = event.resource.listName
      ? (LIST_COLOR_MAP[event.resource.listName] ?? DEFAULT_COLOR)
      : DEFAULT_COLOR
    return {
      style: {
        backgroundColor: colors.bg,
        color: colors.text,
        border: 'none',
        borderRadius: '6px',
        fontSize: '12px',
        padding: '2px 6px',
      },
    }
  }

  function onEventDrop({ event, start }) {
    const newDate = format(start, 'yyyy-MM-dd')
    updateTask(event.id, { dueDate: newDate })
  }

  function onEventResize({ event, start }) {
    const newDate = format(start, 'yyyy-MM-dd')
    updateTask(event.id, { dueDate: newDate })
  }

  const allResidents = residents.filter(r => !r.archived)
  const allHouseholds = households.filter(h => !h.archived)

  const selectClass = "border border-sage-200 rounded-lg px-3 py-1.5 text-xs text-sage-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300"

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-4 border-b border-sage-100 bg-sage-50 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-2xl text-sage-800">Calendar</h2>
          <button
            onClick={() => setShowGoogleModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-sage-200 rounded-lg text-sage-600 hover:bg-sage-50 transition-colors"
          >
            <CalendarIcon size={13} className="text-blue-500" />
            Connect Google Cal
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select value={residentFilter} onChange={e => setResidentFilter(e.target.value)} className={selectClass}>
            <option value="">All Residents</option>
            {allResidents.map(r => (
              <option key={r.id} value={r.id}>{r.preferredName || r.legalName}</option>
            ))}
          </select>

          <select value={householdFilter} onChange={e => setHouseholdFilter(e.target.value)} className={selectClass}>
            <option value="">All Households</option>
            {allHouseholds.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          {(residentFilter || householdFilter) && (
            <button
              onClick={() => { setResidentFilter(''); setHouseholdFilter('') }}
              className="px-3 py-1.5 text-xs text-sage-400 hover:text-sage-700 border border-sage-200 rounded-lg"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Color legend */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(LIST_COLOR_MAP).map(([name, val]) => (
            <span key={name} className="flex items-center gap-1 text-xs text-sage-500">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: val.bg }} />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden p-4 md:p-6 min-h-0">
        <DnDCalendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          eventPropGetter={eventPropGetter}
          onEventDrop={onEventDrop}
          onEventResize={onEventResize}
          resizable
          style={{ height: '100%' }}
          popup
        />
      </div>

      {showGoogleModal && <GoogleCalModal onClose={() => setShowGoogleModal(false)} />}
    </div>
  )
}
