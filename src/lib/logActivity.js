/**
 * logActivity — insert a row into activity_log.
 *
 * NOTE: Supabase JS never throws — it returns { error }.
 * We check that explicitly instead of using try/catch, which would
 * never fire and silently swallow write failures.
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
  const { error } = await supabase.from('activity_log').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    old_value: oldValue,
    new_value: newValue,
  })
  if (error) {
    console.warn('[logActivity] Failed to log activity:', error.message, '| code:', error.code)
  }
}
