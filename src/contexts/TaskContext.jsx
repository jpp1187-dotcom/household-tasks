import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logActivity'
import { createEvent } from '../lib/googleCalendar'
import { useAuth } from './AuthContext'

// ─── Context ──────────────────────────────────────────────────────────────────
// Exposes: tasks, lists, loading
//          addTask, updateTask, deleteTask, archiveTask, toggleDone, addList
//
// Task data model (v2 — no project_id):
//   resident_id, household_id, domain_tag, list_id

const TaskContext = createContext(null)

function mapTask(row) {
  return {
    id: row.id,
    listId: row.list_id,
    residentId: row.resident_id ?? null,
    householdId: row.household_id ?? null,
    domainTag: row.domain_tag ?? '',
    title: row.title,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    notes: row.notes,
    archived: row.archived ?? false,
    googleEventId: row.google_event_id ?? '',
    googleCalendarId: row.google_calendar_id ?? '',
    createdAt: row.created_at,
  }
}

function mapList(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    householdId: row.household_id ?? null,
    archived: row.archived ?? false,
  }
}

export function TaskProvider({ children }) {
  const { currentUser } = useAuth()
  const [tasks, setTasks] = useState([])
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('lists').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    ]).then(([listsRes, tasksRes]) => {
      if (listsRes.data) setLists(listsRes.data.map(mapList))
      if (tasksRes.data) setTasks(tasksRes.data.map(mapTask))
      setLoading(false)
    })
  }, [])

  async function addTask(task) {
    const insertData = {
      list_id:      task.listId      ?? null,
      resident_id:  task.residentId  ?? null,
      household_id: task.householdId ?? null,
      domain_tag:   task.domainTag   ?? null,
      title:        task.title,
      assigned_to:  task.assignedTo  ?? null,
      created_by:   task.createdBy   ?? currentUser?.id,
      priority:     task.priority    ?? 'medium',
      status:       'todo',
      due_date:     task.dueDate     ?? null,
      notes:        task.notes       ?? '',
      archived:     false,
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    const newTask = mapTask(data)
    setTasks(prev => [newTask, ...prev])
    await logActivity(supabase, currentUser?.id, 'created', 'task', newTask.id, newTask.title)
    if (newTask.dueDate && !newTask.googleEventId) {
      await createEvent(newTask)
    }
    return newTask
  }

  async function updateTask(id, changes) {
    const task = tasks.find(t => t.id === id)
    const dbChanges = {}
    if ('title'       in changes) dbChanges.title        = changes.title
    if ('assignedTo'  in changes) dbChanges.assigned_to  = changes.assignedTo
    if ('priority'    in changes) dbChanges.priority     = changes.priority
    if ('status'      in changes) dbChanges.status       = changes.status
    if ('dueDate'     in changes) dbChanges.due_date     = changes.dueDate
    if ('notes'       in changes) dbChanges.notes        = changes.notes
    if ('archived'    in changes) dbChanges.archived     = changes.archived
    if ('residentId'  in changes) dbChanges.resident_id  = changes.residentId
    if ('householdId' in changes) dbChanges.household_id = changes.householdId
    if ('domainTag'   in changes) dbChanges.domain_tag   = changes.domainTag
    if ('listId'      in changes) dbChanges.list_id      = changes.listId
    const { error } = await supabase.from('tasks').update(dbChanges).eq('id', id)
    if (error) throw error
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))

    let action = 'updated'
    if ('priority'   in changes) action = `updated priority to ${changes.priority}`
    if ('assignedTo' in changes) action = 'assigned to'
    if ('status'     in changes) action = changes.status === 'done' ? 'completed' : `set status to ${changes.status}`
    if ('archived'   in changes) action = changes.archived ? 'archived' : 'restored'
    await logActivity(supabase, currentUser?.id, action, 'task', id, task?.title)
  }

  async function deleteTask(id) {
    const task = tasks.find(t => t.id === id)
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    setTasks(prev => prev.filter(t => t.id !== id))
    await logActivity(supabase, currentUser?.id, 'deleted', 'task', id, task?.title)
  }

  async function archiveTask(id) {
    await updateTask(id, { archived: true })
  }

  async function toggleDone(id) {
    const task = tasks.find(t => t.id === id)
    await updateTask(id, { status: task.status === 'done' ? 'todo' : 'done' })
  }

  async function addList(list) {
    const { data, error } = await supabase
      .from('lists')
      .insert({ name: list.name, icon: list.icon ?? '📋', color: list.color ?? 'sage' })
      .select()
      .single()
    if (error) throw error
    const newList = mapList(data)
    setLists(prev => [...prev, newList])
    return newList
  }

  return (
    <TaskContext.Provider value={{
      tasks, lists, loading,
      addTask, updateTask, deleteTask, archiveTask, toggleDone, addList,
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  return useContext(TaskContext)
}
