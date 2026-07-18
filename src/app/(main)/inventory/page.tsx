// src/app/(main)/inventory/page.tsx
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import InventoryClient from './InventoryClient'
import { Package, Layers, Warehouse } from 'lucide-react'

export default async function InventoryPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  // Ringkasan stok
  let summaryQuery = supabase
    .from('inv_warehouse_stock')
    .select('qty, dim_products!inner(id)')
    .gt('qty', 0)

  if (profile.role !== 'superadmin') {
    summaryQuery = summaryQuery.eq('warehouse_id', profile.wh_id)
  }
  const { data: summaryData } = await summaryQuery
  const uniqueProducts = new Set(summaryData?.map((s: any) => s.dim_products?.id)).size
  const totalQty = summaryData?.reduce((sum: number, s: any) => sum + (s.qty || 0), 0) || 0

  // Daftar warehouse (untuk superadmin)
  let warehouses: any[] = []
  if (profile.role === 'superadmin') {
    const { data: whData } = await supabase
      .from('dim_warehouses')
      .select('id, name')
      .order('name')
    warehouses = whData || []
  }

  // Data ringkasan kartu
  const summaryCards = [
    { 
      label: 'Total Produk Unik', 
      value: uniqueProducts, 
      icon: <Package size={24} className="text-blue-600" />,
      bg: 'bg-blue-50'
    },
    { 
      label: 'Total Kuantitas', 
      value: totalQty.toLocaleString('id-ID'), 
      icon: <Layers size={24} className="text-green-600" />,
      bg: 'bg-green-50'
    },
    { 
      label: 'Cakupan Gudang', 
      value: profile.role === 'superadmin' ? 'Semua Gudang' : 'Gudang Utama Anda', 
      icon: <Warehouse size={24} className="text-amber-600" />,
      bg: 'bg-amber-50'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Stock</h1>
        <p className="text-sm text-slate-500 mt-1">Pantau dan kelola ketersediaan stok di gudang Anda</p>
      </div>

      {/* Summary Cards Rendered */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-0.5">{card.label}</p>
              <p className="text-xl font-bold text-slate-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabel + Filter */}
      <InventoryClient
        role={profile.role}
        warehouses={warehouses}
        userWhId={profile.wh_id}
      />
    </div>
  )
}