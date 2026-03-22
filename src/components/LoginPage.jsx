import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="flex h-screen items-center justify-center bg-sage-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 sm:px-8 py-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="https://dhwcawykduzxtohollmx.supabase.co/storage/v1/object/public/avatars/gormy.png" alt="GormBase" className="h-16 w-auto mb-4" />
          <h1 className="font-display text-2xl text-sage-800">GormBase</h1>
          <p className="text-xs text-sage-400 mt-0.5">Your household, organized.</p>
        </div>

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
