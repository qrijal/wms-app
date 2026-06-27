import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-xl font-bold mb-6">WMS Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/brands" className="hover:bg-blue-50 p-2 rounded">Brands</Link>
          <Link href="/admin/uoms" className="hover:bg-blue-50 p-2 rounded">UOM</Link>
          <Link href="/admin/products" className="hover:bg-blue-50 p-2 rounded">Products</Link>
          <Link href="/admin/locations" className="hover:bg-blue-50 p-2 rounded">Locations</Link>
          <Link href="/admin/inventory" className="hover:bg-blue-50 p-2 rounded">Inventory</Link>
          <Link href="/admin/inbound/new" className="hover:bg-blue-50 p-2 rounded">Inbound Baru</Link>
          <Link href="/admin/outbound/new" className="hover:bg-blue-50 p-2 rounded">Outbound Baru</Link>
          <Link href="/admin/transfer/new" className="hover:bg-blue-50 p-2 rounded">Transfer</Link>
        </nav>
        <div className="mt-auto">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}