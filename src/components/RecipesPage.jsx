import React, { useState, useEffect, useCallback } from 'react'
import { X, Plus, Search, Edit2, Clock, Users, Upload, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TAG_EMOJI = {
  pasta: '🍝', salad: '🥗', dessert: '🍰', breakfast: '🍳',
  soup: '🍲', sandwich: '🥪', chicken: '🍗', fish: '🐟',
  vegetarian: '🥦', vegan: '🌱', beef: '🥩', snack: '🍿',
}

function tagEmoji(tags) {
  if (!tags?.length) return '🍳'
  for (const t of tags) {
    const key = t.toLowerCase()
    if (TAG_EMOJI[key]) return TAG_EMOJI[key]
  }
  return '🍳'
}

function TagChip({ tag, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors
        ${active ? 'bg-sage-700 text-white border-sage-700' : 'bg-white text-sage-600 border-sage-200 hover:border-sage-400'}`}
    >
      {tag}
    </button>
  )
}

// ── Recipe card ────────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onClick }) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-sage-100 shadow-sm hover:border-sage-300 transition-colors text-left overflow-hidden flex flex-col"
    >
      {recipe.photo_url ? (
        <img src={recipe.photo_url} alt={recipe.title} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-sage-50 flex items-center justify-center text-5xl">
          {tagEmoji(recipe.tags)}
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold text-sage-800 text-sm leading-snug">{recipe.title}</h3>
        <div className="flex items-center gap-3 text-xs text-sage-400">
          {totalTime > 0 && (
            <span className="flex items-center gap-1"><Clock size={11} /> {totalTime} min</span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1"><Users size={11} /> {recipe.servings}</span>
          )}
        </div>
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {recipe.tags.slice(0, 3).map(t => (
              <span key={t} className="px-2 py-0.5 bg-sage-50 text-sage-500 text-xs rounded-full">{t}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Recipe detail modal ────────────────────────────────────────────────────────
function RecipeDetail({ recipe, onClose, onEdit, canEdit }) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : (recipe.ingredients ?? '').split('\n').filter(Boolean)
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : (recipe.instructions ?? '').split('\n').filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header image */}
        {recipe.photo_url ? (
          <img src={recipe.photo_url} alt={recipe.title} className="w-full h-48 object-cover rounded-t-2xl" />
        ) : (
          <div className="w-full h-32 bg-sage-50 rounded-t-2xl flex items-center justify-center text-6xl">
            {tagEmoji(recipe.tags)}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="font-display text-2xl text-sage-800">{recipe.title}</h2>
            <div className="flex gap-2 shrink-0">
              {canEdit && (
                <button onClick={onEdit} className="p-2 text-sage-400 hover:text-sage-700 transition-colors">
                  <Edit2 size={16} />
                </button>
              )}
              <button onClick={onClose} className="p-2 text-sage-400 hover:text-sage-700 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {recipe.description && <p className="text-sm text-sage-500 mb-4">{recipe.description}</p>}

          <div className="flex flex-wrap gap-4 text-xs text-sage-500 mb-4">
            {recipe.prep_time > 0 && <span><strong>Prep:</strong> {recipe.prep_time} min</span>}
            {recipe.cook_time > 0 && <span><strong>Cook:</strong> {recipe.cook_time} min</span>}
            {totalTime > 0 && <span><strong>Total:</strong> {totalTime} min</span>}
            {recipe.servings && <span><strong>Serves:</strong> {recipe.servings}</span>}
          </div>

          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {recipe.tags.map(t => (
                <span key={t} className="px-2 py-0.5 bg-sage-100 text-sage-600 text-xs rounded-full">{t}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-sage-700 mb-2 text-sm">Ingredients</h3>
              <ul className="space-y-1">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-2 text-sm text-sage-700">
                    <span className="text-sage-400 shrink-0">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sage-700 mb-2 text-sm">Instructions</h3>
              <ol className="space-y-2">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-sage-700">
                    <span className="font-bold text-sage-400 shrink-0 w-5">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit modal ─────────────────────────────────────────────────────────────
function RecipeForm({ recipe, onClose, onSaved }) {
  const { currentUser } = useAuth()
  const isEdit = !!recipe?.id

  const [form, setForm] = useState({
    title:        recipe?.title        ?? '',
    description:  recipe?.description  ?? '',
    prep_time:    recipe?.prep_time    ?? '',
    cook_time:    recipe?.cook_time    ?? '',
    servings:     recipe?.servings     ?? '',
    ingredients:  Array.isArray(recipe?.ingredients)
                    ? recipe.ingredients.join('\n')
                    : (recipe?.ingredients ?? ''),
    instructions: Array.isArray(recipe?.instructions)
                    ? recipe.instructions.join('\n')
                    : (recipe?.instructions ?? ''),
    tags:         recipe?.tags?.join(', ') ?? '',
    photo_url:    recipe?.photo_url    ?? '',
  })
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tagInput,  setTagInput]  = useState(form.tags)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const parsedTags = tagInput.split(',').map(t => t.trim()).filter(Boolean)

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `recipes/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('list-photos').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('list-photos').getPublicUrl(path)
      set('photo_url', data.publicUrl)
    }
    setUploading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title:        form.title.trim(),
      description:  form.description.trim(),
      prep_time:    Number(form.prep_time) || 0,
      cook_time:    Number(form.cook_time) || 0,
      servings:     Number(form.servings) || null,
      ingredients:  form.ingredients.split('\n').map(l => l.trim()).filter(Boolean),
      instructions: form.instructions.split('\n').map(l => l.trim()).filter(Boolean),
      tags:         parsedTags,
      photo_url:    form.photo_url || null,
    }
    if (isEdit) {
      const { error } = await supabase.from('recipes').update(payload).eq('id', recipe.id)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('recipes').insert({ ...payload, created_by: currentUser.id })
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved?.()
  }

  const inputCls = 'w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-sage-800">{isEdit ? 'Edit Recipe' : 'Add Recipe'}</h2>
          <button onClick={onClose} className="text-sage-400 hover:text-sage-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-sage-500 mb-1">Prep (min)</label>
              <input type="number" min="0" value={form.prep_time} onChange={e => set('prep_time', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sage-500 mb-1">Cook (min)</label>
              <input type="number" min="0" value={form.cook_time} onChange={e => set('cook_time', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sage-500 mb-1">Servings</label>
              <input type="number" min="1" value={form.servings} onChange={e => set('servings', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Ingredients (one per line)</label>
            <textarea value={form.ingredients} onChange={e => set('ingredients', e.target.value)}
              rows={5} placeholder="2 cups flour&#10;1 tsp salt&#10;…" className={`${inputCls} resize-none font-mono text-xs`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Instructions (one step per line)</label>
            <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
              rows={5} placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;…" className={`${inputCls} resize-none text-xs`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Tags (comma-separated)</label>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="pasta, dinner, quick"
              className={inputCls} />
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {parsedTags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-sage-100 text-sage-600 text-xs rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Photo</label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-sage-300 rounded-lg hover:bg-sage-50 transition-colors">
              {uploading ? <Loader size={14} className="animate-spin text-sage-400" /> : <Upload size={14} className="text-sage-400" />}
              <span className="text-xs text-sage-500">{uploading ? 'Uploading…' : form.photo_url ? 'Change photo' : 'Upload photo'}</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
            </label>
            {form.photo_url && <img src={form.photo_url} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-sage-500 border border-sage-200 rounded-xl hover:bg-sage-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex-1 py-2 text-sm font-semibold bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const { currentUser } = useAuth()
  const [recipes,     setRecipes]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [activeTag,   setActiveTag]   = useState(null)
  const [allTags,     setAllTags]     = useState([])
  const [selected,    setSelected]    = useState(null)  // recipe to view
  const [editing,     setEditing]     = useState(null)  // recipe to edit (or 'new')
  const [showForm,    setShowForm]    = useState(false)

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
    const all = data ?? []
    setRecipes(all)
    // Extract unique tags client-side
    const tagSet = new Set()
    all.forEach(r => r.tags?.forEach(t => tagSet.add(t)))
    setAllTags([...tagSet].sort())
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  const filtered = recipes.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase())
    const matchTag = !activeTag || r.tags?.includes(activeTag)
    return matchSearch && matchTag
  })

  function canEdit(recipe) {
    return recipe.created_by === currentUser?.id || currentUser?.role === 'admin'
  }

  function openEdit(recipe) {
    setSelected(null)
    setEditing(recipe)
    setShowForm(true)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-sage-50 z-10 px-4 md:px-8 pt-6 pb-4 border-b border-sage-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl text-sage-800">🍳 Recipes</h2>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-sage-600 text-white rounded-xl hover:bg-sage-700 transition-colors"
          >
            <Plus size={15} /> Add Recipe
          </button>
        </div>
        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-300 bg-white"
          />
        </div>
        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <TagChip tag="All" active={!activeTag} onClick={() => setActiveTag(null)} />
            {allTags.map(t => (
              <TagChip key={t} tag={t} active={activeTag === t} onClick={() => setActiveTag(t === activeTag ? null : t)} />
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="px-4 md:px-8 py-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-sage-200 border-t-sage-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-sage-300 text-center">
            <p className="text-5xl mb-3">🍳</p>
            <p className="text-sm">{recipes.length === 0 ? 'No recipes yet. Add your first!' : 'No recipes match your search.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => (
              <RecipeCard key={r.id} recipe={r} onClick={() => setSelected(r)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <RecipeDetail
          recipe={selected}
          canEdit={canEdit(selected)}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
        />
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <RecipeForm
          recipe={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchRecipes() }}
        />
      )}
    </div>
  )
}
