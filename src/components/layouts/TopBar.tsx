'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from './SidebarContext'
import { Menu, LogOut, User } from 'lucide-react'

export default function TopBar() {
  const [userData, setUserData] = useState<{ full_name: string; role: string } | null>(null)
  const [warehouseName, setWarehouseName] = useState<string | null>(null)
  const { toggle } = useSidebar()
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('dim_users')
        .select('full_name, role, wh_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserData({ full_name: profile.full_name, role: profile.role })
        if (profile.wh_id) {
          const { data: wh } = await supabase
            .from('dim_warehouses')
            .select('name')
            .eq('id', profile.wh_id)
            .single()
          if (wh) setWarehouseName(wh.name)
        }
      }
    })()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button onClick={toggle} className="p-2 hover:bg-gray-100 rounded">
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-semibold">Dashboard</h1>
          {warehouseName && (
            <span className="text-xs text-gray-500">Gudang Aktif: {warehouseName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {userData && (
          <div className="text-sm text-right">
            <div className="font-medium">{userData.full_name}</div>
            <div className="text-xs text-gray-500">{userData.role}</div>
          </div>
        )}
        <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded text-red-600">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}