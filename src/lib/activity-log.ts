import { supabase } from './supabase'

export async function logActivity(
  actor: string,
  action: string,
  targetType?: string,
  targetId?: string,
  targetTitle?: string,
  details?: string
) {
  await supabase.from('activity_log').insert({
    actor,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    target_title: targetTitle || null,
    details: details || null,
  } as never)
}
