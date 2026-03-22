import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logActivity'
import { useAuth } from './AuthContext'

// ─── Context ──────────────────────────────────────────────────────────────────
// Exposes: households, projects, residents, activity, loading, dbError
//          addHousehold, updateHousehold
//          addProject, updateProject
//          addResident, updateResident
//          refreshActivity

const HouseholdContext = createContext(null)

function mapHousehold(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',        // legacy field
    address1: row.address1 ?? '',
    address2: row.address2 ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zip: row.zip ?? '',
    propertyType: row.property_type ?? '',
    contactName: row.contact_name ?? '',
    contactEmail: row.contact_email ?? '',
    contactPhone: row.contact_phone ?? '',
    contactAddress: row.contact_address ?? '',
    description: row.description ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapProject(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    residentId: row.resident_id ?? null,
    projectType: row.project_type ?? '',
    name: row.name,
    description: row.description ?? '',
    status: row.status ?? 'active',
    dueDate: row.due_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapResident(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    legalFirst: row.legal_first ?? '',
    legalLast: row.legal_last ?? '',
    preferredName: row.preferred_name ?? '',
    pronouns: row.pronouns ?? '',
    dob: row.dob ?? null,
    primaryLanguage: row.primary_language ?? '',
    gender: row.gender ?? '',
    contactPhone: row.contact_phone ?? '',
    contactEmail: row.contact_email ?? '',
    contactAddress: row.contact_address ?? '',
    ssn: row.ssn ?? '',
    medicaidId: row.medicaid_id ?? '',
    otherIdName: row.other_id_name ?? '',
    otherIdValue: row.other_id_value ?? '',
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

// Detect "table does not exist" errors from Supabase/PostgreSQL
function isMissingTable(error) {
  return error?.code === '42P01' || error?.message?.includes('does not exist')
}

export function HouseholdProvider({ children }) {
  const { currentUser } = useAuth()
  const [households, setHouseholds] = useState([])
  const [projects, setProjects] = useState([])
  const [residents, setResidents] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('households').select('*').order('created_at', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: true }),
      supabase.from('residents').select('*').order('created_at', { ascending: true }),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100),
    ]).then(([hRes, pRes, rRes, aRes]) => {
      const missingTables = []
      if (hRes.error) {
        if (isMissingTable(hRes.error)) missingTables.push('households')
        else console.error('[HouseholdContext] households error:', hRes.error.message)
      }
      if (pRes.error) {
        if (isMissingTable(pRes.error)) missingTables.push('projects')
        else console.error('[HouseholdContext] projects error:', pRes.error.message)
      }
      if (rRes.error) {
        if (isMissingTable(rRes.error)) missingTables.push('residents')
        else console.error('[HouseholdContext] residents error:', rRes.error.message)
      }
      if (aRes.error) {
        if (isMissingTable(aRes.error)) missingTables.push('activity_log')
        else console.error('[HouseholdContext] activity_log error:', aRes.error.message)
      }

      if (missingTables.length > 0) {
        setDbError(
          `Required tables not found in Supabase: ${missingTables.join(', ')}. ` +
          'Please run the GormBase schema SQL in your Supabase SQL Editor.'
        )
      }

      if (hRes.data) setHouseholds(hRes.data.map(mapHousehold))
      if (pRes.data) setProjects(pRes.data.map(mapProject))
      if (rRes.data) setResidents(rRes.data.map(mapResident))
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
    const dbChanges = {}
    if ('name'           in changes) dbChanges.name            = changes.name
    if ('address'        in changes) dbChanges.address         = changes.address
    if ('address1'       in changes) dbChanges.address1        = changes.address1
    if ('address2'       in changes) dbChanges.address2        = changes.address2
    if ('city'           in changes) dbChanges.city            = changes.city
    if ('state'          in changes) dbChanges.state           = changes.state
    if ('zip'            in changes) dbChanges.zip             = changes.zip
    if ('propertyType'   in changes) dbChanges.property_type   = changes.propertyType
    if ('contactName'    in changes) dbChanges.contact_name    = changes.contactName
    if ('contactEmail'   in changes) dbChanges.contact_email   = changes.contactEmail
    if ('contactPhone'   in changes) dbChanges.contact_phone   = changes.contactPhone
    if ('contactAddress' in changes) dbChanges.contact_address = changes.contactAddress
    if ('description'    in changes) dbChanges.description     = changes.description

    const { error } = await supabase.from('households').update(dbChanges).eq('id', id)
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
        resident_id: data.residentId ?? null,
        project_type: data.projectType ?? '',
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
    if ('projectType' in changes) dbChanges.project_type = changes.projectType
    const { error } = await supabase.from('projects').update(dbChanges).eq('id', id)
    if (error) throw error
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    const p = projects.find(p => p.id === id)
    const action = changes.status === 'completed' ? 'completed' : 'updated'
    await logActivity(supabase, currentUser?.id, action, 'project', id, p?.name)
  }

  async function addResident(data) {
    const { data: row, error } = await supabase
      .from('residents')
      .insert({
        household_id: data.householdId,
        legal_first: data.legalFirst ?? '',
        legal_last: data.legalLast ?? '',
        preferred_name: data.preferredName ?? '',
        pronouns: data.pronouns ?? '',
        dob: data.dob ?? null,
        primary_language: data.primaryLanguage ?? '',
        gender: data.gender ?? '',
        contact_phone: data.contactPhone ?? '',
        contact_email: data.contactEmail ?? '',
        contact_address: data.contactAddress ?? '',
        ssn: data.ssn ?? '',
        medicaid_id: data.medicaidId ?? '',
        other_id_name: data.otherIdName ?? '',
        other_id_value: data.otherIdValue ?? '',
        created_by: currentUser?.id,
      })
      .select()
      .single()
    if (error) throw error
    const newR = mapResident(row)
    setResidents(prev => [...prev, newR])
    await logActivity(supabase, currentUser?.id, 'created', 'resident', newR.id,
      `${newR.legalFirst} ${newR.legalLast}`)
    return newR
  }

  async function updateResident(id, changes) {
    const dbChanges = {}
    if ('legalFirst'      in changes) dbChanges.legal_first     = changes.legalFirst
    if ('legalLast'       in changes) dbChanges.legal_last      = changes.legalLast
    if ('preferredName'   in changes) dbChanges.preferred_name  = changes.preferredName
    if ('pronouns'        in changes) dbChanges.pronouns        = changes.pronouns
    if ('dob'             in changes) dbChanges.dob             = changes.dob
    if ('primaryLanguage' in changes) dbChanges.primary_language = changes.primaryLanguage
    if ('gender'          in changes) dbChanges.gender          = changes.gender
    if ('contactPhone'    in changes) dbChanges.contact_phone   = changes.contactPhone
    if ('contactEmail'    in changes) dbChanges.contact_email   = changes.contactEmail
    if ('contactAddress'  in changes) dbChanges.contact_address = changes.contactAddress
    if ('ssn'             in changes) dbChanges.ssn             = changes.ssn
    if ('medicaidId'      in changes) dbChanges.medicaid_id     = changes.medicaidId
    if ('otherIdName'     in changes) dbChanges.other_id_name   = changes.otherIdName
    if ('otherIdValue'    in changes) dbChanges.other_id_value  = changes.otherIdValue

    const { error } = await supabase.from('residents').update(dbChanges).eq('id', id)
    if (error) throw error
    setResidents(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
    const r = residents.find(r => r.id === id)
    await logActivity(supabase, currentUser?.id, 'updated', 'resident', id,
      r ? `${r.legalFirst} ${r.legalLast}` : id)
  }

  async function refreshActivity() {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      console.error('[HouseholdContext] refreshActivity error:', error.message)
      return
    }
    if (data) setActivity(data.map(mapActivity))
  }

  return (
    <HouseholdContext.Provider value={{
      households, projects, residents, activity, loading, dbError,
      addHousehold, updateHousehold,
      addProject, updateProject,
      addResident, updateResident,
      refreshActivity,
    }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHouseholds() {
  return useContext(HouseholdContext)
}
