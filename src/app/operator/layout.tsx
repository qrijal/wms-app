import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OperatorTopBar from '@/components/layouts/OperatorTopBar'

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('dim_users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Izinkan operator dan admin (admin bisa monitoring mobile)
  if (!profile || (profile.role !== 'operator' && profile.role !== 'admin')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OperatorTopBar />
      <main className="p-4">{children}</main>
    </div>
  )
}