/**
 * logActivity — insert a row into activity_log.
 * Silently no-ops if the table doesn't exist yet (so the app never crashes
 * just because activity logging is unavailable).
 */
export async function logActivity(
  supabase,
  userId,
  action,
  entityType,
  entityId,
  entityName,
  oldValue = null,
  newValue = null,
) {
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_value: oldValue,
      new_value: newValue,
    })
  } catch (err) {
    console.warn('[logActivity] Failed to log activity:', err?.message ?? err)
  }
}
