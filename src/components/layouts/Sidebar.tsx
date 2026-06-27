'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSidebar } from './SidebarContext'
import { MenuItem } from './menu-items'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function Sidebar({ menuItems }: { menuItems: MenuItem[] }) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-40 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center h-16 px-4 border-b">
        <h1 className={`font-bold text-lg ${collapsed ? 'hidden' : 'block'}`}>WMS</h1>
      </div>
      <nav className="mt-4 space-y-1">
        {menuItems.map((item, idx) => (
          <SidebarMenuItem key={idx} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  )
}

function SidebarMenuItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const { collapsed } = useSidebar()
  const [open, setOpen] = useState(false)
  const hasChildren = !!item.children?.length
  const isActive = pathname === item.path

  if (!hasChildren) {
    return (
      <Link href={item.path!} className={`flex items-center px-4 py-3 text-sm hover:bg-gray-100 ${isActive ? 'bg-blue-50 text-blue-600' : ''}`}>
        <item.icon size={20} />
        {!collapsed && <span className="ml-3">{item.label}</span>}
      </Link>
    )
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-gray-100">
        <div className="flex items-center">
          <item.icon size={20} />
          {!collapsed && <span className="ml-3">{item.label}</span>}
        </div>
        {!collapsed && (open ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
      </button>
      {open && !collapsed && (
        <div className="ml-4 border-l pl-4 space-y-1">
          {item.children!.map((child, idx) => (
            <Link key={idx} href={child.path!} className={`flex items-center px-3 py-2 text-sm rounded hover:bg-gray-100 ${pathname === child.path ? 'text-blue-600' : ''}`}>
              <child.icon size={16} />
              <span className="ml-3">{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}