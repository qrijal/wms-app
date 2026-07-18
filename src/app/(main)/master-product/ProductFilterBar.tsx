'use client'

import { Search, Filter, RotateCcw } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function FilterInner({ warehouses, role }: { warehouses: any[], role: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Ambil state dari URL jika ada
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [selectedWh, setSelectedWh] = useState(searchParams.get('wh') || '')

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (searchTerm) params.set('q', searchTerm)
    else params.delete('q')
    
    if (selectedWh) params.set('wh', selectedWh)
    else params.delete('wh')

    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchTerm('')
    setSelectedWh('')
    router.replace(pathname) 
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 sm:items-end">
      
      {/* 1. Input Search Nama / Kode Produk */}
      <div className="flex-1 w-full">
        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cari Nama / Kode Produk</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all bg-white"
            placeholder="Ketik nama atau SKU lalu klik Apply..."
          />
        </div>
      </div>

      {/* 2. Select Warehouse (Khusus Superadmin) */}
      {role === 'superadmin' && (
        <div className="w-full sm:w-56 shrink-0">
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Filter Warehouse</label>
          <select
            value={selectedWh}
            onChange={(e) => setSelectedWh(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white cursor-pointer"
          >
            <option value="">Semua Warehouse</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Tombol Aksi */}
      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0 ">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-semibold flex items-center justify-center gap-2 flex-1 sm:flex-none transition-colors"
        >
          <RotateCcw size={16} /> Reset
        </button>
        <button
          onClick={handleApply}
          className="px-6 py-1   bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-semibold flex items-center justify-center gap-2 flex-1 sm:flex-none transition-colors shadow-sm"
        >
          <Filter size={14} /> Apply
        </button>
      </div>

    </div>
  )
}

export default function ProductFilterBar({ warehouses, role }: { warehouses: any[], role: string }) {
  return (
    <Suspense fallback={<div className="h-20 w-full bg-slate-100 animate-pulse rounded-xl mb-6"></div>}>
      <FilterInner warehouses={warehouses} role={role} />
    </Suspense>
  )
}