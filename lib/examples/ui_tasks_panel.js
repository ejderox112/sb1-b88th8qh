// Supabase client
import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://YOUR_PROJECT_ID.supabase.co', 'YOUR_ANON_KEY')

// Kullanıcı görevlerini listele (owner + tenant filtreli)
async function fetchUserTasks(userId, tenantId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('tenant_id', tenantId)
  return { data, error }
}

// Admin görevleri listele (tüm kayıtlar)
async function fetchAllTasksAsAdmin() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
  return { data, error }
}

// Yeni görev ekle (kullanıcı için)
async function insertTask(title, userId, tenantId) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        title,
        owner_user_id: userId,
        tenant_id: tenantId
      }
    ])
  return { data, error }
}

// Görev sil (sadece kendi görevleri için)
async function deleteTask(taskId, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('owner_user_id', userId)
  return { data, error }
}

