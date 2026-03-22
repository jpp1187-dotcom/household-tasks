import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Context ──────────────────────────────────────────────────────────────────
// Exposes:
//   currentUser, allUsers, loading
//   signIn(email, password), signOut()
//   canEdit()         — true if roles includes admin or member
//   isAdmin()         — true if roles includes admin
//   canEditList(list) — role-based: household lists check specific roles

const AuthContext = createContext(null)

// Normalise a profile row so roles is always an array and role is roles[0]
function normalizeProfile(p, email = null) {
  const roles = Array.isArray(p.roles)
    ? p.roles
    : [p.role ?? 'member']
  return {
    ...p,
    email: email ?? p.email,
    roles,
    role: roles[0] ?? 'member', // backward-compat single-role string
  }
}

// Map emoji icon → the role that grants edit access on that list type
const ROLE_BY_LIST_ICON = {
  '🛒': 'chef',
  '✈️': 'travel_agent',
  '🏠': 'cleaner',
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user)
      else {
        setCurrentUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(authUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    const user = profile
      ? normalizeProfile(profile, authUser.email)
      : {
          id: authUser.id,
          email: authUser.email,
          name: authUser.email.split('@')[0],
          roles: ['member'],
          role: 'member',
          avatar: '🧑',
          color: 'bg-sage-500',
        }

    setCurrentUser(user)

    const { data: profiles } = await supabase.from('profiles').select('*')
    setAllUsers(profiles?.map(p => normalizeProfile(p)) ?? [user])

    setLoading(false)
  }

  async function refreshProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (profile) setCurrentUser(normalizeProfile(profile, session.user.email))
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function canEdit() {
    if (!currentUser) return false
    return currentUser.roles.includes('admin') || currentUser.roles.includes('member')
  }

  function isAdmin() {
    return currentUser?.roles?.includes('admin') ?? false
  }

  function canEditList(list) {
    if (!currentUser) return false
    if (currentUser.roles.includes('admin')) return true
    // Household-scoped lists: check domain-specific roles
    if (list?.householdId) {
      const required = ROLE_BY_LIST_ICON[list.icon]
      if (required && currentUser.roles.includes(required)) return true
      // Fall back to generic member check
    }
    return canEdit()
  }

  return (
    <AuthContext.Provider value={{
      currentUser, allUsers, loading,
      signIn, signOut, refreshProfile,
      canEdit, isAdmin, canEditList,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
