'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, type ComponentType } from 'react'
import { useSidebar } from './SidebarContext'
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'

type MenuItem = {
  label: string
  path?: string
  icon: ComponentType<{ size?: number; className?: string }>
  children?: MenuItem[]
}

export default function Sidebar({ menuItems }: { menuItems: MenuItem[] }) {
  const { collapsed, toggle } = useSidebar()
  const pathname = usePathname()

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Tombol Toggle Mengambang di Sebelah Kanan Border */}
      <button
        onClick={toggle}
        className="absolute -right-3.5 top-6 flex items-center justify-center w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md text-slate-400 hover:text-[#047bb5] hover:bg-[#f0f7ff] transition-all z-50 cursor-pointer"
        title="Toggle Sidebar"
      >
        {collapsed ? (
          <ChevronRight size={16} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={16} strokeWidth={2.5} />
        )}
      </button>

      {/* Container Menu */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
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

  const isChildActive = hasChildren && item.children!.some((c) => pathname === c.path)
  const isActive = pathname === item.path || isChildActive

  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [isChildActive])

  const activeClasses = "bg-[#f0f7ff] text-[#047bb5] font-semibold"
  const inactiveClasses = "text-slate-600 hover:bg-slate-50 hover:text-slate-900"

  if (!hasChildren) {
    return (
      <Link
        href={item.path!}
        className={`flex items-center px-4 py-3 text-sm rounded-2xl transition-colors ${
          isActive ? activeClasses : inactiveClasses
        }`}
      >
        <div className="flex items-center justify-center min-w-[24px]">
          <item.icon size={20} className={isActive ? "text-[#047bb5]" : "text-slate-500"} />
        </div>
        {!collapsed && <span className="ml-3">{item.label}</span>}
      </Link>
    )
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full px-4 py-3 text-sm rounded-2xl transition-colors ${
          isActive ? activeClasses : inactiveClasses
        }`}
      >
        <div className="flex items-center">
          <div className="flex items-center justify-center min-w-[24px]">
            <item.icon size={20} className={isActive ? "text-[#047bb5]" : "text-slate-500"} />
          </div>
          {!collapsed && <span className="ml-3">{item.label}</span>}
        </div>
        {!collapsed && (
          open ? (
            <ChevronDown size={16} className={isActive ? "text-[#047bb5]" : "text-slate-400"} />
          ) : (
            <ChevronRight size={16} className={isActive ? "text-[#047bb5]" : "text-slate-400"} />
          )
        )}
      </button>

      {open && !collapsed && (
        <div className="mt-1.5 ml-5 border-l-2 border-slate-100 pl-3 space-y-1">
          {item.children!.map((child, idx) => {
            const isChildItemSelected = pathname === child.path
            return (
              <Link
                key={idx}
                href={child.path!}
                className={`flex items-center px-3 py-2.5 text-sm rounded-xl transition-colors ${
                  isChildItemSelected
                    ? 'bg-[#f0f7ff] text-[#047bb5] font-medium'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-center min-w-[20px]">
                  <child.icon size={18} className={isChildItemSelected ? "text-[#047bb5]" : "text-slate-400"} />
                </div>
                <span className="ml-2.5">{child.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}