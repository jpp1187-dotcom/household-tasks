import React, { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { X, Calendar as CalendarIcon } from 'lucide-react'
import { useTasks } from '../contexts/TaskContext'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })
const DnDCalendar = withDragAndDrop(Calendar)

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
          Google Calendar sync will be available in a future version.
          When enabled, all tasks with due dates will automatically appear in your
          Google Calendar, and changes made in either app will sync in real time.
        </p>
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
  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())
  const [listFilter, setListFilter] = useState('')
  const [showGoogleModal, setShowGoogleModal] = useState(false)

  const activeLists = lists.filter(l => !l.archived)

  // Map tasks with due dates to calendar events
  const events = useMemo(() => {
    return tasks
      .filter(t => t.dueDate && !t.archived)
      .filter(t => !listFilter || t.listId === listFilter)
      .map(t => {
        const d = new Date(t.dueDate + 'T12:00:00')
        const list = lists.find(l => l.id === t.listId)
        return {
          id: t.id,
          title: t.title,
          start: d,
          end: d,
          allDay: true,
          resource: { task: t, listColor: list?.color ?? null },
        }
      })
  }, [tasks, lists, listFilter])

  function eventPropGetter(event) {
    const bg = event.resource.listColor ?? DEFAULT_COLOR.bg
    return {
      style: {
        backgroundColor: bg,
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '12px',
        padding: '2px 6px',
      },
    }
  }

  function onEventDrop({ event, start }) {
    updateTask(event.id, { dueDate: format(start, 'yyyy-MM-dd') })
  }

  function onEventResize({ event, start }) {
    updateTask(event.id, { dueDate: format(start, 'yyyy-MM-dd') })
  }

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

        {/* List filter */}
        <div className="flex flex-wrap gap-2">
          <select
            value={listFilter}
            onChange={e => setListFilter(e.target.value)}
            className="border border-sage-200 rounded-lg px-3 py-1.5 text-xs text-sage-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300"
          >
            <option value="">All Lists</option>
            {activeLists.map(l => (
              <option key={l.id} value={l.id}>{l.icon} {l.name}</option>
            ))}
          </select>

          {listFilter && (
            <button
              onClick={() => setListFilter('')}
              className="px-3 py-1.5 text-xs text-sage-400 hover:text-sage-700 border border-sage-200 rounded-lg"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Color legend */}
        {activeLists.filter(l => l.color).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {activeLists.filter(l => l.color).map(l => (
              <span key={l.id} className="flex items-center gap-1 text-xs text-sage-500">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: l.color }} />
                {l.name}
              </span>
            ))}
          </div>
        )}
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
