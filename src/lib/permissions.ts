import { createClient } from '@/lib/supabase/server'

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile, error } = await supabase
    .from('dim_users')
    .select('id, role, wh_id')
    .eq('id', user.id)
    .single()
  if (error || !profile) throw new Error('Profil tidak ditemukan')
  return { user, ...profile }
}

export async function requireSuperadmin() {
  const profile = await getUserProfile()
  if (profile.role !== 'superadmin') throw new Error('Hanya superadmin yang diizinkan')
  return profile
}

export async function requireAdmin() {
  const profile = await getUserProfile()
  if (profile.role !== 'admin') throw new Error('Hanya admin yang diizinkan')
  return profile
}