import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Google "G" logo as inline SVG
function GoogleLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message ?? 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Page will redirect — no further state needed
    } catch (err) {
      setError(err.message ?? 'Google sign-in failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-sage-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 sm:px-8 py-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="https://dhwcawykduzxtohollmx.supabase.co/storage/v1/object/public/avatars/gormy.png" alt="GormBase" className="h-16 w-auto mb-4" />
          <h1 className="font-display text-2xl text-sage-800">GormBase</h1>
          <p className="text-xs text-sage-400 mt-0.5">Your household, organized.</p>
        </div>

        {/* Google sign-in (only shown when VITE_GOOGLE_CLIENT_ID is configured) */}
        {GOOGLE_CLIENT_ID && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-sage-700 border border-sage-200 rounded-lg hover:bg-sage-50 transition-colors disabled:opacity-50 mb-4"
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
              ) : (
                <GoogleLogo />
              )}
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-sage-100" />
              <span className="text-xs text-sage-300 shrink-0">or</span>
              <div className="flex-1 h-px bg-sage-100" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Email</label>
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
