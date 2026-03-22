import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Context ──────────────────────────────────────────────────────────────────
// AuthContext exposes:
//   currentUser  — the logged-in user profile (from `profiles` table)
//   allUsers     — all profiles (for the "Assign to" picker)
//   loading      — true while resolving the initial session
//   signIn(email, password) — returns a rejected promise on failure
//   signOut()
//   canEdit()    — true if role is admin or member
//   isAdmin()    — true if role is admin

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user)
      } else {
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
      ? { ...profile, email: authUser.email }
      : { id: authUser.id, email: authUser.email, name: authUser.email.split('@')[0], role: 'member', avatar: '🧑', color: 'bg-sage-500' }

    setCurrentUser(user)

    // Fetch all profiles so other components can build assignee pickers
    const { data: profiles } = await supabase.from('profiles').select('*')
    setAllUsers(profiles?.map(p => ({ ...p })) ?? [user])

    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function canEdit() {
    return currentUser?.role === 'admin' || currentUser?.role === 'member'
  }

  function isAdmin() {
    return currentUser?.role === 'admin'
  }

  return (
    <AuthContext.Provider value={{ currentUser, allUsers, loading, signIn, signOut, canEdit, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
