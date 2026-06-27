import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layouts/DashboardLayout'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cek profil (opsional, bisa juga tidak, tapi pastikan ada)
  const { data: profile } = await supabase
    .from('dim_users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/setup')

  return <DashboardLayout>{children}</DashboardLayout>
}