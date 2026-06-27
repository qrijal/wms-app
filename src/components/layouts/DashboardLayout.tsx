'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider, useSidebar } from './SidebarContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { superadminMenu, adminMenu } from './menu-items'

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const [menuItems, setMenuItems] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('dim_users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'superadmin') {
        setMenuItems(superadminMenu)
      } else {
        setMenuItems(adminMenu)
      }
    })()
  }, [])

  return (
    <div className="flex">
      <Sidebar menuItems={menuItems} />
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <TopBar />
        <main className="mt-16 p-6">{children}</main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}