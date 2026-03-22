import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logActivity'
import { useAuth } from './AuthContext'

// ─── Context ──────────────────────────────────────────────────────────────────
// Exposes: households, projects, residents, activity, loading, dbError
//          addHousehold, updateHousehold, archiveHousehold, deleteHousehold
//          addProject, updateProject, archiveProject, deleteProject
//          addResident, updateResident, archiveResident, deleteResident
//          refreshActivity

const HouseholdContext = createContext(null)

function mapHousehold(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    address_1: row.address_1 ?? '',
    address_2: row.address_2 ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zip: row.zip ?? '',
    propertyType: row.property_type ?? '',
    contactName: row.contact_name ?? '',
    contactEmail: row.contact_email ?? '',
    contactPhone: row.contact_phone ?? '',
    contactAddress: row.contact_address ?? '',
    description: row.description ?? '',
    archived: row.archived ?? false,
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
    archived: row.archived ?? false,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapResident(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    legalName: row.legal_name ?? '',
    preferredName: row.preferred_name ?? '',
    genderIdentity: row.gender_identity ?? '',
    sexAtBirth: row.sex_at_birth ?? '',
    raceEthnicity: row.race_ethnicity ?? '',
    primaryLanguage: row.primary_language ?? '',
    contactMethod: row.contact_method ?? '',
    contactAddress: row.contact_address ?? '',
    mailingAddress: row.mailing_address ?? '',
    emergencyContact: row.emergency_contact ?? '',
    ssnMasked: row.ssn_masked ?? '',
    medicaidId: row.medicaid_id ?? '',
    medicareId: row.medicare_id ?? '',
    mpiId: row.mpi_id ?? '',
    govIdType: row.gov_id_type ?? '',
    govIdNumber: row.gov_id_number ?? '',
    otherInsuranceId: row.other_insurance_id ?? '',
    archived: row.archived ?? false,
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

  // ── Households ──────────────────────────────────────────────────────────────

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
    if ('address_1'      in changes) dbChanges.address_1       = changes.address_1
    if ('address_2'      in changes) dbChanges.address_2       = changes.address_2
    if ('city'           in changes) dbChanges.city            = changes.city
    if ('state'          in changes) dbChanges.state           = changes.state
    if ('zip'            in changes) dbChanges.zip             = changes.zip
    if ('propertyType'   in changes) dbChanges.property_type   = changes.propertyType
    if ('contactName'    in changes) dbChanges.contact_name    = changes.contactName
    if ('contactEmail'   in changes) dbChanges.contact_email   = changes.contactEmail
    if ('contactPhone'   in changes) dbChanges.contact_phone   = changes.contactPhone
    if ('contactAddress' in changes) dbChanges.contact_address = changes.contactAddress
    if ('description'    in changes) dbChanges.description     = changes.description
    if ('archived'       in changes) dbChanges.archived        = changes.archived

    const { error } = await supabase.from('households').update(dbChanges).eq('id', id)
    if (error) throw error
    setHouseholds(prev => prev.map(h => h.id === id ? { ...h, ...changes } : h))
    const h = households.find(h => h.id === id)
    const action = 'archived' in changes ? (changes.archived ? 'archived' : 'restored') : 'updated'
    await logActivity(supabase, currentUser?.id, action, 'household', id, h?.name)
  }

  async function archiveHousehold(id) {
    await updateHousehold(id, { archived: true })
  }

  async function restoreHousehold(id) {
    await updateHousehold(id, { archived: false })
  }

  async function deleteHousehold(id) {
    const h = households.find(h => h.id === id)
    // Cascade: delete tasks → projects → residents → household
    const hProjects = projects.filter(p => p.householdId === id)
    for (const p of hProjects) {
      await supabase.from('tasks').delete().eq('project_id', p.id)
    }
    await supabase.from('projects').delete().eq('household_id', id)
    await supabase.from('residents').delete().eq('household_id', id)
    const { error } = await supabase.from('households').delete().eq('id', id)
    if (error) throw error
    setHouseholds(prev => prev.filter(x => x.id !== id))
    setProjects(prev => prev.filter(p => p.householdId !== id))
    setResidents(prev => prev.filter(r => r.householdId !== id))
    await logActivity(supabase, currentUser?.id, 'deleted', 'household', id, h?.name)
  }

  // ── Projects ────────────────────────────────────────────────────────────────

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
    if ('name'        in changes) dbChanges.name         = changes.name
    if ('description' in changes) dbChanges.description  = changes.description
    if ('status'      in changes) dbChanges.status       = changes.status
    if ('dueDate'     in changes) dbChanges.due_date     = changes.dueDate
    if ('projectType' in changes) dbChanges.project_type = changes.projectType
    if ('archived'    in changes) dbChanges.archived     = changes.archived
    const { error } = await supabase.from('projects').update(dbChanges).eq('id', id)
    if (error) throw error
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    const p = projects.find(p => p.id === id)
    let action = changes.status === 'completed' ? 'completed' : 'updated'
    if ('archived' in changes) action = changes.archived ? 'archived' : 'restored'
    await logActivity(supabase, currentUser?.id, action, 'project', id, p?.name)
  }

  async function archiveProject(id) {
    await updateProject(id, { archived: true })
  }

  async function restoreProject(id) {
    await updateProject(id, { archived: false })
  }

  async function deleteProject(id) {
    const p = projects.find(p => p.id === id)
    await supabase.from('tasks').delete().eq('project_id', id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    setProjects(prev => prev.filter(x => x.id !== id))
    await logActivity(supabase, currentUser?.id, 'deleted', 'project', id, p?.name)
  }

  // ── Residents ───────────────────────────────────────────────────────────────

  async function addResident(data) {
    const { data: row, error } = await supabase
      .from('residents')
      .insert({
        household_id:      data.householdId,
        legal_name:        data.legalName ?? '',
        preferred_name:    data.preferredName ?? '',
        gender_identity:   data.genderIdentity ?? '',
        sex_at_birth:      data.sexAtBirth ?? '',
        race_ethnicity:    data.raceEthnicity ?? '',
        primary_language:  data.primaryLanguage ?? '',
        contact_method:    data.contactMethod ?? '',
        contact_address:   data.contactAddress ?? '',
        mailing_address:   data.mailingAddress ?? '',
        emergency_contact: data.emergencyContact ?? '',
        ssn_masked:        data.ssnMasked ?? '',
        medicaid_id:       data.medicaidId ?? '',
        medicare_id:       data.medicareId ?? '',
        mpi_id:            data.mpiId ?? '',
        gov_id_type:       data.govIdType ?? '',
        gov_id_number:     data.govIdNumber ?? '',
        other_insurance_id: data.otherInsuranceId ?? '',
        created_by:        currentUser?.id,
      })
      .select()
      .single()
    if (error) throw error
    const newR = mapResident(row)
    setResidents(prev => [...prev, newR])
    await logActivity(supabase, currentUser?.id, 'created', 'resident', newR.id, newR.legalName)
    return newR
  }

  async function updateResident(id, changes) {
    const dbChanges = {}
    if ('legalName'        in changes) dbChanges.legal_name        = changes.legalName
    if ('preferredName'    in changes) dbChanges.preferred_name    = changes.preferredName
    if ('genderIdentity'   in changes) dbChanges.gender_identity   = changes.genderIdentity
    if ('sexAtBirth'       in changes) dbChanges.sex_at_birth      = changes.sexAtBirth
    if ('raceEthnicity'    in changes) dbChanges.race_ethnicity    = changes.raceEthnicity
    if ('primaryLanguage'  in changes) dbChanges.primary_language  = changes.primaryLanguage
    if ('contactMethod'    in changes) dbChanges.contact_method    = changes.contactMethod
    if ('contactAddress'   in changes) dbChanges.contact_address   = changes.contactAddress
    if ('mailingAddress'   in changes) dbChanges.mailing_address   = changes.mailingAddress
    if ('emergencyContact' in changes) dbChanges.emergency_contact = changes.emergencyContact
    if ('ssnMasked'        in changes) dbChanges.ssn_masked        = changes.ssnMasked
    if ('medicaidId'       in changes) dbChanges.medicaid_id       = changes.medicaidId
    if ('medicareId'       in changes) dbChanges.medicare_id       = changes.medicareId
    if ('mpiId'            in changes) dbChanges.mpi_id            = changes.mpiId
    if ('govIdType'        in changes) dbChanges.gov_id_type       = changes.govIdType
    if ('govIdNumber'      in changes) dbChanges.gov_id_number     = changes.govIdNumber
    if ('otherInsuranceId' in changes) dbChanges.other_insurance_id = changes.otherInsuranceId
    if ('archived'         in changes) dbChanges.archived          = changes.archived

    const { error } = await supabase.from('residents').update(dbChanges).eq('id', id)
    if (error) throw error

    const r = residents.find(r => r.id === id)

    // Name sync: if legalName changed, update project names that contained old name
    if ('legalName' in changes && r?.legalName && changes.legalName !== r.legalName) {
      const residentProjects = projects.filter(p => p.residentId === id)
      for (const p of residentProjects) {
        if (p.name.includes(r.legalName)) {
          const newName = p.name.replace(r.legalName, changes.legalName)
          await supabase.from('projects').update({ name: newName }).eq('id', p.id)
          setProjects(prev => prev.map(x => x.id === p.id ? { ...x, name: newName } : x))
        }
      }
    }

    setResidents(prev => prev.map(x => x.id === id ? { ...x, ...changes } : x))

    let action = 'updated'
    if ('archived' in changes) action = changes.archived ? 'archived' : 'restored'
    await logActivity(supabase, currentUser?.id, action, 'resident', id, r?.legalName ?? id)
  }

  async function archiveResident(id) {
    await updateResident(id, { archived: true })
  }

  async function restoreResident(id) {
    await updateResident(id, { archived: false })
  }

  async function deleteResident(id) {
    const r = residents.find(r => r.id === id)
    const rProjects = projects.filter(p => p.residentId === id)
    for (const p of rProjects) {
      await supabase.from('tasks').delete().eq('project_id', p.id)
    }
    await supabase.from('projects').delete().eq('resident_id', id)
    const { error } = await supabase.from('residents').delete().eq('id', id)
    if (error) throw error
    setResidents(prev => prev.filter(x => x.id !== id))
    setProjects(prev => prev.filter(p => p.residentId !== id))
    await logActivity(supabase, currentUser?.id, 'deleted', 'resident', id, r?.legalName ?? id)
  }

  // ── Activity ─────────────────────────────────────────────────────────────────

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
      addHousehold, updateHousehold, archiveHousehold, restoreHousehold, deleteHousehold,
      addProject, updateProject, archiveProject, restoreProject, deleteProject,
      addResident, updateResident, archiveResident, restoreResident, deleteResident,
      refreshActivity,
    }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHouseholds() {
  return useContext(HouseholdContext)
}
