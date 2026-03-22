/**
 * favorites.js — pin/unpin residents and households.
 * Uses localStorage for zero-config storage.
 * If a `favorites` table exists in Supabase, call syncToSupabase() to persist.
 */
import { supabase } from './supabase'

const LS_KEY = (userId) => `gormbase-favorites-${userId}`

function readLocal(userId) {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(userId)) || '[]')
  } catch {
    return []
  }
}

function writeLocal(userId, favorites) {
  localStorage.setItem(LS_KEY(userId), JSON.stringify(favorites))
}

export async function getFavorites(userId) {
  // Try Supabase first
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!error && data) return data
  // Fall back to localStorage
  return readLocal(userId)
}

export async function addFavorite(userId, entityType, entityId) {
  // Try Supabase
  const { error } = await supabase
    .from('favorites')
    .upsert(
      { user_id: userId, entity_type: entityType, entity_id: entityId },
      { onConflict: 'user_id,entity_type,entity_id', ignoreDuplicates: true }
    )

  // Always mirror to localStorage
  const favs = readLocal(userId)
  const exists = favs.some(f => f.entity_type === entityType && f.entity_id === entityId)
  if (!exists) {
    favs.push({ id: `${entityType}-${entityId}`, entity_type: entityType, entity_id: entityId })
    writeLocal(userId, favs)
  }
}

export async function removeFavorite(userId, entityType, entityId) {
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  const favs = readLocal(userId)
  writeLocal(userId, favs.filter(f => !(f.entity_type === entityType && f.entity_id === entityId)))
}

export function isFavorited(favorites, entityType, entityId) {
  return favorites.some(f => f.entity_type === entityType && f.entity_id === entityId)
}
