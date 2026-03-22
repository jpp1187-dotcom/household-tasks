import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logActivity'
import { useAuth } from './AuthContext'

// ─── Context ──────────────────────────────────────────────────────────────────
// Exposes: households, projects, activity, loading
//          addHousehold, updateHousehold
//          addProject, updateProject
//          refreshActivity

const HouseholdContext = createContext(null)

function mapHousehold(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    description: row.description ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapProject(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    description: row.description ?? '',
    status: row.status ?? 'active',
    dueDate: row.due_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapActivity(row) {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at,
  }
}

export function HouseholdProvider({ children }) {
  const { currentUser } = useAuth()
  const [households, setHouseholds] = useState([])
  const [projects, setProjects] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('households').select('*').order('created_at', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: true }),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100),
    ]).then(([hRes, pRes, aRes]) => {
      if (hRes.data) setHouseholds(hRes.data.map(mapHousehold))
      if (pRes.data) setProjects(pRes.data.map(mapProject))
      if (aRes.data) setActivity(aRes.data.map(mapActivity))
      setLoading(false)
    })
  }, [])

  async function addHousehold(data) {
    const { data: row, error } = await supabase
      .from('households')
      .insert({
        name: data.name,
        address: data.address ?? '',
        description: data.description ?? '',
        created_by: currentUser?.id,
      })
      .select()
      .single()
    if (error) throw error
    const newH = mapHousehold(row)
    setHouseholds(prev => [...prev, newH])
    await logActivity(supabase, currentUser?.id, 'created', 'household', newH.id, newH.name)
    return newH
  }

  async function updateHousehold(id, changes) {
    const { error } = await supabase.from('households').update(changes).eq('id', id)
    if (error) throw error
    setHouseholds(prev => prev.map(h => h.id === id ? { ...h, ...changes } : h))
    const h = households.find(h => h.id === id)
    await logActivity(supabase, currentUser?.id, 'updated', 'household', id, h?.name)
  }

  async function addProject(data) {
    const { data: row, error } = await supabase
      .from('projects')
      .insert({
        household_id: data.householdId,
        name: data.name,
        description: data.description ?? '',
        status: data.status ?? 'active',
        due_date: data.dueDate ?? null,
        created_by: currentUser?.id,
      })
      .select()
      .single()
    if (error) throw error
    const newP = mapProject(row)
    setProjects(prev => [...prev, newP])
    await logActivity(supabase, currentUser?.id, 'created', 'project', newP.id, newP.name)
    return newP
  }

  async function updateProject(id, changes) {
    const dbChanges = {}
    if ('name'        in changes) dbChanges.name        = changes.name
    if ('description' in changes) dbChanges.description = changes.description
    if ('status'      in changes) dbChanges.status      = changes.status
    if ('dueDate'     in changes) dbChanges.due_date    = changes.dueDate
    const { error } = await supabase.from('projects').update(dbChanges).eq('id', id)
    if (error) throw error
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    const p = projects.find(p => p.id === id)
    const action = changes.status === 'completed' ? 'completed' : 'updated'
    await logActivity(supabase, currentUser?.id, action, 'project', id, p?.name)
  }

  async function refreshActivity() {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setActivity(data.map(mapActivity))
  }

  return (
    <HouseholdContext.Provider value={{
      households, projects, activity, loading,
      addHousehold, updateHousehold,
      addProject, updateProject,
      refreshActivity,
    }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHouseholds() {
  return useContext(HouseholdContext)
}
