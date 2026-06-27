// src/app/(main)/inventory/page.tsx
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import InventoryClient from './InventoryClient'

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

  // Kirim ringkasan dalam bentuk array agar mudah dipetakan
  const summaryCards = [
    { label: 'Total Produk Unik', value: uniqueProducts, color: 'text-blue-600' },
    { label: 'Total Kuantitas', value: totalQty.toLocaleString(), color: 'text-green-600' },
    { label: 'Gudang', value: profile.role === 'superadmin' ? 'Semua Gudang' : 'Gudang Anda', color: 'text-gray-700' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Stock</h1>
        </div>
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