import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-xl font-bold mb-6">WMS Superadmin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/superadmin/companies" className="hover:bg-blue-50 p-2 rounded">Companies</Link>
          <Link href="/superadmin/branches" className="hover:bg-blue-50 p-2 rounded">Branches</Link>
          <Link href="/superadmin/warehouses" className="hover:bg-blue-50 p-2 rounded">Warehouses</Link>
        </nav>
        <div className="mt-auto">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}