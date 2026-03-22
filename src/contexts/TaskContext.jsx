import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logActivity'
import { useAuth } from './AuthContext'

// ─── Context ──────────────────────────────────────────────────────────────────
// Exposes: tasks, lists, loading
//          addTask, updateTask, deleteTask, toggleDone, addList

const TaskContext = createContext(null)

function mapTask(row) {
  return {
    id: row.id,
    listId: row.list_id,
    projectId: row.project_id ?? null,
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
    householdId: row.household_id ?? null,
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
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        list_id: task.listId ?? null,
        project_id: task.projectId ?? null,
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
    await logActivity(supabase, currentUser?.id, 'created', 'task', newTask.id, newTask.title)
    return newTask
  }

  async function updateTask(id, changes) {
    const task = tasks.find(t => t.id === id)
    const dbChanges = {}
    if ('title'      in changes) dbChanges.title       = changes.title
    if ('assignedTo' in changes) dbChanges.assigned_to = changes.assignedTo
    if ('priority'   in changes) dbChanges.priority    = changes.priority
    if ('status'     in changes) dbChanges.status      = changes.status
    if ('dueDate'    in changes) dbChanges.due_date    = changes.dueDate
    if ('notes'      in changes) dbChanges.notes       = changes.notes
    const { error } = await supabase.from('tasks').update(dbChanges).eq('id', id)
    if (error) throw error
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))

    let action = 'updated'
    if ('priority'   in changes) action = `updated priority to ${changes.priority}`
    if ('assignedTo' in changes) action = 'assigned to'
    if ('status'     in changes) action = changes.status === 'done' ? 'completed' : `set status to ${changes.status}`
    await logActivity(supabase, currentUser?.id, action, 'task', id, task?.title)
  }

  async function deleteTask(id) {
    const task = tasks.find(t => t.id === id)
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    setTasks(prev => prev.filter(t => t.id !== id))
    await logActivity(supabase, currentUser?.id, 'deleted', 'task', id, task?.title)
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
