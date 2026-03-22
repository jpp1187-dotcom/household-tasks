import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Context ──────────────────────────────────────────────────────────────────
// TaskContext exposes:
//   tasks, lists  — arrays of live data from Supabase
//   loading       — true during initial fetch
//   addTask(task)
//   updateTask(id, changes)
//   deleteTask(id)
//   toggleDone(id)
//   addList(list)  — returns the created list object

const TaskContext = createContext(null)

// Map snake_case DB rows → camelCase app objects
function mapTask(row) {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function mapList(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
  }
}

export function TaskProvider({ children }) {
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
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        list_id: task.listId,
        title: task.title,
        assigned_to: task.assignedTo ?? null,
        created_by: task.createdBy,
        priority: task.priority ?? 'medium',
        status: 'todo',
        due_date: task.dueDate ?? null,
        notes: task.notes ?? '',
      })
      .select()
      .single()
    if (error) throw error
    const newTask = mapTask(data)
    setTasks(prev => [newTask, ...prev])
    return newTask
  }

  async function updateTask(id, changes) {
    const dbChanges = {}
    if ('title' in changes)      dbChanges.title       = changes.title
    if ('assignedTo' in changes) dbChanges.assigned_to = changes.assignedTo
    if ('priority' in changes)   dbChanges.priority    = changes.priority
    if ('status' in changes)     dbChanges.status      = changes.status
    if ('dueDate' in changes)    dbChanges.due_date    = changes.dueDate
    if ('notes' in changes)      dbChanges.notes       = changes.notes
    const { error } = await supabase.from('tasks').update(dbChanges).eq('id', id)
    if (error) throw error
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    setTasks(prev => prev.filter(t => t.id !== id))
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
    <TaskContext.Provider value={{ tasks, lists, loading, addTask, updateTask, deleteTask, toggleDone, addList }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  return useContext(TaskContext)
}
