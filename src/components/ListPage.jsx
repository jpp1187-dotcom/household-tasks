import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Check, Calendar, Plus, Image, Edit2, X as XIcon, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function UserBubble({ userId, allUsers, size = 5 }) {
  const user = allUsers?.find(u => u.id === userId)
  if (!user) return null
  const initials = (user.name ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const hue = (user.name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <span
      title={user.name}
      className={`shrink-0 w-${size} h-${size} rounded-full text-white font-semibold flex items-center justify-center`}
      style={{ backgroundColor: `hsl(${hue}, 45%, 48%)`, fontSize: size === 5 ? 9 : 11 }}
    >
      {initials[0]}
    </span>
  )
}

export default function ListPage({ listId, listName, listIcon, listColor = '#4a7c4a' }) {
  const { currentUser, allUsers } = useAuth()
  const { updateTask, updateList } = useTasks()

  // ── Inline name editing ────────────────────────────────────────────────────
  const [localName,  setLocalName]  = useState(listName)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft,  setNameDraft]  = useState(listName)
  const [savingName, setSavingName] = useState(false)
  const nameInputRef = useRef(null)

  async function handleSaveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === localName || savingName) { setEditingName(false); return }
    setSavingName(true)
    await updateList(listId, { name: trimmed })
    setLocalName(trimmed)
    setEditingName(false)
    setSavingName(false)
  }

  function startEditingName() {
    setNameDraft(localName)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }

  // ── Description ────────────────────────────────────────────────────────────
  const [description, setDescription] = useState('')
  const [descDraft,   setDescDraft]   = useState('')
  const [descLoaded,  setDescLoaded]  = useState(false)

  useEffect(() => {
    supabase
      .from('lists')
      .select('description')
      .eq('id', listId)
      .single()
      .then(({ data }) => {
        const val = data?.description ?? ''
        setDescription(val)
        setDescDraft(val)
        setDescLoaded(true)
      })
      .catch(() => setDescLoaded(true))
  }, [listId])

  async function handleDescBlur() {
    if (descDraft === description) return
    await supabase.from('lists').update({ description: descDraft }).eq('id', listId)
    setDescription(descDraft)
  }

  // ── Photos ─────────────────────────────────────────────────────────────────
  const [photos,          setPhotos]          = useState([])
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false)
  const [uploadError,     setUploadError]     = useState('')
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    supabase
      .from('list_photos')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPhotos(data ?? []))
      .catch(() => {})
  }, [listId])

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset error state
    setUploadError('')

    // Validate file size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large — maximum size is 10 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Sanitise filename for storage path
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath  = `${listId}/${Date.now()}-${safeName}`

    setUploadingPhoto(true)
    try {
      // ── 1. Upload to Supabase Storage ────────────────────────────────────
      const { error: storageErr } = await supabase.storage
        .from('list-photos')
        .upload(filePath, file, {
          upsert:      true,
          contentType: file.type || 'image/jpeg',
        })

      if (storageErr) {
        console.error('[ListPage] storage upload error:', storageErr)
        // Common bucket-not-found → friendly message
        if (storageErr.message?.includes('Bucket not found') || storageErr.statusCode === 404) {
          setUploadError('Storage bucket "list-photos" not found. Run the SQL migration in Supabase to create it.')
        } else if (storageErr.statusCode === 403 || storageErr.message?.includes('policy')) {
          setUploadError('Upload permission denied. Check the RLS policy on the list-photos bucket.')
        } else {
          setUploadError(`Upload failed: ${storageErr.message}`)
        }
        return
      }

      // ── 2. Get public URL ─────────────────────────────────────────────────
      const { data: urlData } = supabase.storage
        .from('list-photos')
        .getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) {
        setUploadError('Upload succeeded but could not get public URL.')
        return
      }

      // ── 3. Insert row in list_photos table ────────────────────────────────
      const { error: dbErr } = await supabase.from('list_photos').insert({
        list_id:    listId,
        url:        publicUrl,
        path:       filePath,
        created_by: currentUser?.id ?? null,
      })
      if (dbErr) {
        console.error('[ListPage] list_photos insert error:', dbErr)
        setUploadError(`DB insert failed: ${dbErr.message}`)
        return
      }

      // ── 4. Refetch list_photos to sync state ──────────────────────────────
      const { data: fresh } = await supabase
        .from('list_photos')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })
      setPhotos(fresh ?? [])
    } catch (err) {
      console.error('[ListPage] unexpected upload error:', err)
      setUploadError(err.message ?? 'Unexpected upload error')
    } finally {
      setUploadingPhoto(false)
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Trigger the file picker — works on iOS Safari when called from a user gesture
  function triggerFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''   // ensure onChange fires even for same file
      fileInputRef.current.click()
    }
  }

  async function handlePhotoDelete(photo) {
    setDeletingPhotoId(photo.id)
    try {
      if (photo.path) await supabase.storage.from('list-photos').remove([photo.path])
      await supabase.from('list_photos').delete().eq('id', photo.id)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
    } finally {
      setDeletingPhotoId(null)
    }
  }

  // ── Items ──────────────────────────────────────────────────────────────────
  const [items,        setItems]        = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [addingItem,   setAddingItem]   = useState(false)

  const fetchItems = useCallback(async () => {
    setLoadingItems(true)
    const { data } = await supabase
      .from('items')
      .select('id, title, done, sort_order, created_by, created_at')
      .eq('list_id', listId)
      .order('sort_order', { ascending: true })
    setItems(data ?? [])
    setLoadingItems(false)
  }, [listId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openItems = items.filter(i => !i.done)
  const doneItems = items.filter(i => i.done)

  async function handleToggleItem(itemId, currentDone) {
    const newDone = !currentDone
    await supabase.from('items').update({ done: newDone }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, done: newDone } : i))
  }

  async function handleDeleteItem(itemId) {
    await supabase.from('items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  async function handleAddItem(e) {
    e?.preventDefault()
    const title = newItemTitle.trim()
    if (!title || addingItem) return
    setAddingItem(true)
    try {
      const { data } = await supabase
        .from('items')
        .insert({
          list_id:    listId,
          title,
          done:       false,
          created_by: currentUser?.id,
          sort_order: items.length,
        })
        .select()
        .single()
      if (data) {
        setItems(prev => [...prev, data])
        setNewItemTitle('')
      }
    } finally {
      setAddingItem(false)
    }
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [listTasks,     setListTasks]     = useState([])
  const [loadingTasks,  setLoadingTasks]  = useState(true)
  const [newTaskTitle,  setNewTaskTitle]  = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskDueDate,  setNewTaskDueDate]  = useState('')
  const [addingTask,    setAddingTask]    = useState(false)
  const addInputRef = useRef(null)

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true)
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, archived, assigned_to')
      .eq('list_id', listId)
      .eq('archived', false)
      .order('due_date', { ascending: true, nullsFirst: false })
    setListTasks(data ?? [])
    setLoadingTasks(false)
  }, [listId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const openTasks = listTasks.filter(t => t.status !== 'done')
  const doneTasks = listTasks.filter(t => t.status === 'done')

  async function handleToggle(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'
    await updateTask(taskId, { status: newStatus })
    setListTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  async function handleAddTask(e) {
    e?.preventDefault()
    const title = newTaskTitle.trim()
    if (!title || addingTask) return
    setAddingTask(true)
    try {
      const { data } = await supabase
        .from('tasks')
        .insert({
          title,
          list_id:     listId,
          created_by:  currentUser?.id,
          assigned_to: newTaskAssignee || currentUser?.id || null,
          due_date:    newTaskDueDate  || null,
          status:      'todo',
          priority:    'medium',
          archived:    false,
        })
        .select('id, title, status, due_date, archived, assigned_to')
        .single()
      if (data) {
        setListTasks(prev => [data, ...prev])
        setNewTaskTitle('')
        setNewTaskAssignee('')
        setNewTaskDueDate('')
        addInputRef.current?.focus()
      }
    } finally {
      setAddingTask(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Color accent bar ── */}
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: listColor }} />

      {/* ── Header ── */}
      <div className="sticky top-0 bg-white z-10 px-4 md:px-8 pt-5 pb-4 border-b border-sage-100 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0">{listIcon}</span>

          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); nameInputRef.current?.blur() }
                if (e.key === 'Escape') { setEditingName(false) }
              }}
              disabled={savingName}
              className="font-display text-2xl text-sage-800 bg-transparent border-b-2 focus:outline-none flex-1 min-w-0"
              style={{ borderColor: listColor }}
            />
          ) : (
            <h2 className="font-display text-2xl text-sage-800 flex-1 min-w-0 truncate">{localName}</h2>
          )}

          <button
            onClick={startEditingName}
            className="text-sage-300 hover:text-sage-600 transition-colors shrink-0"
            title="Rename list"
          >
            <Edit2 size={15} />
          </button>
        </div>
        <p className="text-xs text-sage-400 mt-1 ml-9">
          {loadingTasks ? 'Loading…' : `${openTasks.length} open · ${doneTasks.length} done`}
        </p>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-3xl space-y-8">

        {/* ── Section 1: Description ── */}
        <section>
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-2">Description</p>
          {descLoaded && (
            <textarea
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              onBlur={handleDescBlur}
              rows={3}
              placeholder="Add a description…"
              className="w-full text-sm text-sage-700 leading-relaxed bg-transparent resize-none focus:outline-none placeholder-sage-300"
            />
          )}
        </section>

        {/* ── Section 2: Photos ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest">Photos</p>
            <button
              onClick={triggerFilePicker}
              disabled={uploadingPhoto}
              className="flex items-center gap-1.5 text-xs text-sage-500 hover:text-sage-700 border border-sage-200 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
            >
              <Image size={12} />
              {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
            </button>
            {/* Use label-wrapping pattern for maximum iOS Safari compatibility */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Upload error feedback */}
          {uploadError && (
            <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600 flex-1">{uploadError}</p>
              <button onClick={() => setUploadError('')} className="text-red-300 hover:text-red-500 shrink-0">
                <XIcon size={12} />
              </button>
            </div>
          )}

          {photos.length === 0 ? (
            <div
              onClick={triggerFilePicker}
              className="border-2 border-dashed border-sage-200 rounded-xl p-8 text-center cursor-pointer hover:border-sage-300 transition-colors"
            >
              <Image size={24} className="text-sage-300 mx-auto mb-2" />
              <p className="text-xs text-sage-400">Click to upload photos</p>
              <p className="text-xs text-sage-300 mt-1">JPG, PNG, HEIC up to 10 MB</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-sage-100 shadow-sm group">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  {(photo.created_by === currentUser?.id || !photo.created_by) && (
                    <button
                      onClick={() => handlePhotoDelete(photo)}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 disabled:opacity-50"
                      title="Delete photo"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={triggerFilePicker}
                disabled={uploadingPhoto}
                className="aspect-square rounded-xl border-2 border-dashed border-sage-200 flex flex-col items-center justify-center hover:border-sage-300 transition-colors disabled:opacity-50"
              >
                <Plus size={18} className="text-sage-300" />
                <span className="text-xs text-sage-400 mt-1">{uploadingPhoto ? '…' : 'Add'}</span>
              </button>
            </div>
          )}
        </section>

        {/* ── Section 3: Items ── */}
        <section className="bg-stone-50 rounded-xl p-4 border border-stone-100">
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-3">Items</p>

          {loadingItems ? (
            <p className="text-xs text-sage-300 py-2">Loading…</p>
          ) : (
            <div className="space-y-0.5">
              {/* Open items */}
              {openItems.map(item => (
                <div key={item.id} className="flex items-center gap-2.5 py-1.5 group">
                  <button
                    onClick={() => handleToggleItem(item.id, item.done)}
                    className="shrink-0 w-4 h-4 rounded border-2 border-sage-300 hover:border-sage-500 flex items-center justify-center transition-colors bg-white"
                  />
                  <span className="flex-1 text-sm text-sage-800">{item.title}</span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-sage-300 hover:text-red-400 transition-all shrink-0"
                    title="Delete item"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              ))}

              {/* Inline add item */}
              <form onSubmit={handleAddItem} className="flex items-center gap-2.5 py-1.5 mt-1">
                <div className="shrink-0 w-4 h-4 rounded border-2 border-dashed border-sage-200 flex-none" />
                <input
                  value={newItemTitle}
                  onChange={e => setNewItemTitle(e.target.value)}
                  placeholder="Add an item…"
                  className="flex-1 text-sm text-sage-800 bg-transparent focus:outline-none placeholder-sage-300"
                />
                <button
                  type="submit"
                  disabled={!newItemTitle.trim() || addingItem}
                  className="shrink-0 text-sage-300 hover:text-sage-600 disabled:opacity-30 transition-colors"
                  title="Add item"
                >
                  <Plus size={14} />
                </button>
              </form>

              {/* Done items */}
              {doneItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-200 space-y-0.5 opacity-50">
                  <p className="text-xs text-sage-400 mb-1.5">Done</p>
                  {doneItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2.5 py-1.5 group">
                      <button
                        onClick={() => handleToggleItem(item.id, item.done)}
                        className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors bg-sage-400 border-sage-400"
                      >
                        <Check size={9} className="text-white" />
                      </button>
                      <span className="flex-1 text-sm text-sage-400 line-through">{item.title}</span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-sage-300 hover:text-red-400 transition-all shrink-0"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Section 4: Tasks ── */}
        <section>
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-3">Tasks</p>

          {loadingTasks ? (
            <p className="text-xs text-sage-300 py-4">Loading…</p>
          ) : (
            <div className="space-y-1">

              {/* Open tasks */}
              {openTasks.map(task => {
                const isOverdue = task.due_date && task.due_date < today()
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border transition-colors
                      ${isOverdue ? 'border-l-4 border-l-red-400 border-r-sage-100 border-t-sage-100 border-b-sage-100' : 'border-sage-100'}`}
                  >
                    <button
                      onClick={() => handleToggle(task.id, task.status)}
                      className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors border-sage-300 hover:border-sage-500"
                    />
                    <span className="flex-1 text-sm text-sage-800">{task.title}</span>
                    {task.assigned_to && (
                      <UserBubble userId={task.assigned_to} allUsers={allUsers} size={5} />
                    )}
                    {task.due_date && (
                      <span className={`text-xs shrink-0 flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-sage-400'}`}>
                        <Calendar size={10} />
                        {task.due_date}
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Inline add task */}
              <div className="mt-1">
                <form onSubmit={handleAddTask} className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim() || addingTask}
                    className="shrink-0 w-5 h-5 rounded-full border-2 border-dashed border-sage-300 flex items-center justify-center hover:border-sage-500 transition-colors disabled:opacity-40"
                    style={{ borderColor: newTaskTitle.trim() ? listColor : undefined }}
                  >
                    {newTaskTitle.trim() && <Plus size={10} style={{ color: listColor }} />}
                  </button>
                  <input
                    ref={addInputRef}
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Add a task…"
                    className="flex-1 text-sm text-sage-800 bg-transparent focus:outline-none placeholder-sage-300"
                  />
                </form>

                {/* Expanded fields when title is present */}
                {newTaskTitle.trim() && (
                  <div className="px-3 pb-2 flex items-center gap-2">
                    <div className="w-5 shrink-0" />
                    <select
                      value={newTaskAssignee}
                      onChange={e => setNewTaskAssignee(e.target.value)}
                      className="flex-1 text-xs border border-sage-200 rounded-lg px-2 py-1.5 text-sage-700 focus:outline-none bg-white"
                    >
                      <option value="">Assign to…</option>
                      {(allUsers ?? []).map(u => (
                        <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                      className="flex-1 text-xs border border-sage-200 rounded-lg px-2 py-1.5 text-sage-700 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Done tasks — faded */}
              {doneTasks.length > 0 && (
                <div className="mt-4 space-y-1 opacity-50">
                  <p className="text-xs text-sage-400 px-3 mb-1">Completed</p>
                  {doneTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-sage-100">
                      <button
                        onClick={() => handleToggle(task.id, task.status)}
                        className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors bg-sage-400 border-sage-400"
                      >
                        <Check size={11} className="text-white" />
                      </button>
                      <span className="flex-1 text-sm text-sage-400 line-through">{task.title}</span>
                      {task.assigned_to && (
                        <UserBubble userId={task.assigned_to} allUsers={allUsers} size={5} />
                      )}
                      {task.due_date && (
                        <span className="text-xs text-sage-300 shrink-0 flex items-center gap-1">
                          <Calendar size={10} />
                          {task.due_date}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </section>

      </div>
    </div>
  )
}
