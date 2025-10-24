// Supabase JS ile RLS test örnekleri — tasks tablosu

import { createClient } from '@supabase/supabase-js'

// Supabase client oluştur
const supabase = createClient(
  'https://YOUR_PROJECT_ID.supabase.co',
  'YOUR_ANON_OR_SERVICE_ROLE_KEY'
)

// JWT claim'leriyle test: owner olarak görev ekleme
async function insertOwnerTask() {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        id: crypto.randomUUID(),
        title: 'Owner task',
        owner_user_id: 'OWNER_UUID',
        tenant_id: 'TENANT_UUID'
      }
    ])
  console.log('Insert result:', { data, error })
}

// Farklı tenant ile görev ekleme (başarısız olmalı)
async function insertBadTenantTask() {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        id: crypto.randomUUID(),
        title: 'Bad tenant',
        owner_user_id: 'OWNER_UUID',
        tenant_id: 'OTHER_TENANT_UUID'
      }
    ])
  console.log('Bad insert result:', { data, error })
}

// Owner olarak görevleri listeleme
async function selectOwnerTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('owner_user_id', 'OWNER_UUID')
  console.log('Owner SELECT:', { data, error })
}

// Admin olarak tüm görevleri listeleme
async function selectAllTasksAsAdmin() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
  console.log('Admin SELECT:', { data, error })
}

// Fonksiyonları sırayla çalıştırmak için
async function runTests() {
  await insertOwnerTask()
  await insertBadTenantTask()
  await selectOwnerTasks()
  await selectAllTasksAsAdmin()
}

runTests()
