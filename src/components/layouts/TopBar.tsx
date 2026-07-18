'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from './SidebarContext'
import { Menu, LogOut, User, MapPin, ChevronDown, Settings, Warehouse } from 'lucide-react'

export default function TopBar() {
  const [userData, setUserData] = useState<{ full_name: string; role: string } | null>(null)
  const [warehouseName, setWarehouseName] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { toggle } = useSidebar()
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser() //
      if (!user) return //[cite: 2]

      const { data: profile } = await supabase
        .from('dim_users')
        .select('full_name, role, wh_id')
        .eq('id', user.id)
        .single() //[cite: 2]

      if (profile) {
        setUserData({ full_name: profile.full_name, role: profile.role }) //[cite: 2]
        if (profile.wh_id) {
          const { data: wh } = await supabase
            .from('dim_warehouses')
            .select('name')
            .eq('id', profile.wh_id)
            .single() //[cite: 2]
          if (wh) setWarehouseName(wh.name) //[cite: 2]
        }
      }
    })()

    // Event listener untuk menutup dropdown saat mengklik di luar elemen
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut() //[cite: 2]
    window.location.href = '/login' //[cite: 2]
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#047bb5] text-white z-50 flex items-center justify-between px-6 shadow-md">
      
      {/* Kiri: Toggle Menu, Logo, dan Lokasi Gudang */}
      <div className="flex items-center gap-6">
        
        {/* Tombol Toggle Sidebar tetap dipertahankan meski disesuaikan warnanya */}
        
        <div className="flex items-center gap-3">
          {/* Logo Placeholder (Kotak Putih) */}
          {/* <div className="bg-white p-1.5 rounded shadow-sm flex items-center justify-center">
             
          </div> */}
          
          {/* Teks Logo */}
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-xl font-bold tracking-wide">WMS Qom</h1>
            <span className="text-[10px] font-semibold tracking-wider text-white/80 uppercase">Logistics Core</span>
          </div>
        </div>

        {/* Divider Vertikal */}
        <div className="hidden md:block h-6 w-px bg-white/30 mx-2"></div>

        {/* Informasi Gudang */}
        {warehouseName && (
          <div className="hidden md:flex items-center gap-2 text-sm">
            <MapPin size={18} />
            <span className="font-semibold uppercase tracking-wider">
              GUDANG: {warehouseName}
            </span>
          </div>
        )}
      </div>

      {/* Kanan: Profil User dan Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-lg transition-colors"
        >
          {/* Ikon User */}
          <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-white/40 bg-white/10">
            <User size={18} className="text-white" />
          </div>
          
          {/* Info User */}
          {userData && (
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-sm font-bold leading-tight">
                {userData.full_name}
              </span>
              <span className="text-[10px] uppercase font-medium text-white/80 tracking-wide mt-0.5">
                {userData.role} {warehouseName ? `| ${warehouseName}` : ''}
              </span>
            </div>
          )}
          
          {/* Arrow Dropdown */}
          <ChevronDown 
            size={18} 
            className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 transform opacity-100 scale-100 transition-all">
            <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
              <Settings size={16} className="text-slate-500" />
              <span className="font-medium">Settings</span>
            </button>
            
            <div className="h-px bg-gray-100 my-1"></div>
            
            <button 
              onClick={handleLogout} 
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <LogOut size={16} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}