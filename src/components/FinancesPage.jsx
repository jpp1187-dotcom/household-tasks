import React, { useState, useEffect } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function formatMoney(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function FinancesPage() {
  const { currentUser } = useAuth()
  const [bills,    setBills]    = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('bills')

  // Add bill modal
  const [showBillModal,    setShowBillModal]    = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('bills').select('*').order('due_date', { ascending: true }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
    ]).then(([billsRes, expRes]) => {
      setBills(billsRes.data ?? [])
      setExpenses(expRes.data ?? [])
      setLoading(false)
    })
  }, [])

  const unpaidBills   = bills.filter(b => !b.paid)
  const paidBills     = bills.filter(b => b.paid)
  const billsTotal    = unpaidBills.reduce((sum, b) => sum + (b.amount ?? 0), 0)

  const thisMonth     = new Date().toISOString().slice(0, 7)
  const monthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth))
  const spendTotal    = monthExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

  async function markPaid(bill) {
    await supabase.from('bills').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', bill.id)
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, paid: true } : b))
  }

  async function deleteBill(id) {
    await supabase.from('bills').delete().eq('id', id)
    setBills(prev => prev.filter(b => b.id !== id))
  }

  async function deleteExpense(id) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-3xl">

      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl text-sage-800">Finances</h2>
        <p className="text-xs text-sage-400 mt-0.5">Bills &amp; shared expenses</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-sage-100 shadow-sm px-5 py-4">
          <p className="text-xs text-sage-400 mb-1">Bills due</p>
          <p className={`text-2xl font-bold ${billsTotal > 0 ? 'text-red-500' : 'text-sage-400'}`}>
            {formatMoney(billsTotal)}
          </p>
          <p className="text-xs text-sage-300 mt-0.5">{unpaidBills.length} unpaid</p>
        </div>
        <div className="bg-white rounded-xl border border-sage-100 shadow-sm px-5 py-4">
          <p className="text-xs text-sage-400 mb-1">This month's spend</p>
          <p className="text-2xl font-bold text-sage-800">{formatMoney(spendTotal)}</p>
          <p className="text-xs text-sage-300 mt-0.5">{monthExpenses.length} expense{monthExpenses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-sage-50 rounded-xl p-1 mb-5 w-fit">
        {['bills', 'expenses'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
              ${tab === t ? 'bg-white text-sage-800 shadow-sm' : 'text-sage-500 hover:text-sage-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-sage-300 py-4">Loading…</p>
      ) : tab === 'bills' ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest">Unpaid</p>
            <button
              onClick={() => setShowBillModal(true)}
              className="flex items-center gap-1.5 text-xs text-sage-500 hover:text-sage-700 border border-sage-200 rounded-lg px-2.5 py-1 transition-colors"
            >
              <Plus size={12} /> Add Bill
            </button>
          </div>
          {unpaidBills.length === 0 ? (
            <p className="text-xs text-sage-300 py-3">No unpaid bills 🎉</p>
          ) : (
            <div className="space-y-2 mb-6">
              {unpaidBills.map(bill => (
                <div key={bill.id} className="flex items-center gap-3 bg-white rounded-xl border border-sage-100 shadow-sm px-4 py-3 group">
                  <button
                    onClick={() => markPaid(bill)}
                    className="shrink-0 w-5 h-5 rounded-full border-2 border-sage-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center transition-colors"
                    title="Mark paid"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-sage-800 font-medium truncate">{bill.name}</p>
                    {bill.due_date && <p className="text-xs text-sage-400">Due {bill.due_date}</p>}
                  </div>
                  <span className="text-sm font-semibold text-red-500 shrink-0">{formatMoney(bill.amount)}</span>
                  <button
                    onClick={() => deleteBill(bill.id)}
                    className="opacity-0 group-hover:opacity-100 text-sage-300 hover:text-sage-600 transition-all shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {paidBills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-3">Paid</p>
              <div className="space-y-2 opacity-50">
                {paidBills.map(bill => (
                  <div key={bill.id} className="flex items-center gap-3 bg-white rounded-xl border border-sage-100 px-4 py-3">
                    <div className="shrink-0 w-5 h-5 rounded-full bg-sage-400 border-2 border-sage-400 flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </div>
                    <span className="flex-1 text-sm text-sage-400 line-through truncate">{bill.name}</span>
                    <span className="text-sm text-sage-400 shrink-0">{formatMoney(bill.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest">All Expenses</p>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-1.5 text-xs text-sage-500 hover:text-sage-700 border border-sage-200 rounded-lg px-2.5 py-1 transition-colors"
            >
              <Plus size={12} /> Add Expense
            </button>
          </div>
          {expenses.length === 0 ? (
            <p className="text-xs text-sage-300 py-3">No expenses yet.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-3 bg-white rounded-xl border border-sage-100 shadow-sm px-4 py-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-sage-800 font-medium truncate">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {exp.category && <span className="text-xs text-sage-400">{exp.category}</span>}
                      {exp.date && <span className="text-xs text-sage-300">{exp.date}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-sage-800 shrink-0">{formatMoney(exp.amount)}</span>
                  <button
                    onClick={() => deleteExpense(exp.id)}
                    className="opacity-0 group-hover:opacity-100 text-sage-300 hover:text-sage-600 transition-all shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBillModal && (
        <AddBillModal
          currentUser={currentUser}
          onClose={() => setShowBillModal(false)}
          onSaved={bill => { setBills(prev => [bill, ...prev]); setShowBillModal(false) }}
        />
      )}
      {showExpenseModal && (
        <AddExpenseModal
          currentUser={currentUser}
          onClose={() => setShowExpenseModal(false)}
          onSaved={exp => { setExpenses(prev => [exp, ...prev]); setShowExpenseModal(false) }}
        />
      )}
    </div>
  )
}

function AddBillModal({ currentUser, onClose, onSaved }) {
  const [name,    setName]    = useState('')
  const [amount,  setAmount]  = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    const { data } = await supabase.from('bills')
      .insert({ name: name.trim(), amount: parseFloat(amount) || 0, due_date: dueDate || null, paid: false, created_by: currentUser?.id })
      .select().single()
    if (data) onSaved(data)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-sage-100">
          <h3 className="font-display text-base text-sage-800">Add Bill</h3>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Bill name" className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" type="number" min="0" step="0.01" className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="px-5 py-2 text-sm font-semibold text-white bg-sage-600 rounded-xl hover:bg-sage-700 disabled:opacity-40">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddExpenseModal({ currentUser, onClose, onSaved }) {
  const [description, setDescription] = useState('')
  const [amount,      setAmount]      = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [category,    setCategory]    = useState('')
  const [saving,      setSaving]      = useState(false)

  async function handleSave() {
    if (!description.trim() || saving) return
    setSaving(true)
    const { data } = await supabase.from('expenses')
      .insert({ description: description.trim(), amount: parseFloat(amount) || 0, date: date || null, category: category.trim() || null, created_by: currentUser?.id })
      .select().single()
    if (data) onSaved(data)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-sage-100">
          <h3 className="font-display text-base text-sage-800">Add Expense</h3>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <input autoFocus value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" type="number" min="0" step="0.01" className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (optional)" className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700">Cancel</button>
          <button onClick={handleSave} disabled={!description.trim() || saving} className="px-5 py-2 text-sm font-semibold text-white bg-sage-600 rounded-xl hover:bg-sage-700 disabled:opacity-40">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
