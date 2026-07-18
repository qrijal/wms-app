import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import LocationTable from './LocationTable'
import AddLocationButton from './AddLocationButton'
import LocationFilterBar from './LocationFilterBar' // <--- Import Komponen Filter Baru

export default async function MasterLocationPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; wh?: string }> // Tambah wh (Warehouse ID)
}) {
  const profile = await getUserProfile()
  const supabase = await createClient()

  // Tangkap query dari URL
  const resolvedParams = await searchParams
  const query = resolvedParams?.q || ''
  const whFilter = resolvedParams?.wh || '' // Filter warehouse dari URL

  let locations: any[] = []
  let warehouses: any[] = []

  if (profile.role === 'superadmin') {
    // 1. Ambil data dropdown warehouse untuk superadmin
    const { data: whData } = await supabase
      .from('dim_warehouses')
      .select('id, name')
      .order('name')
    warehouses = whData || []

    // 2. Query Utama Lokasi (Superadmin)
    let dbQuery = supabase
      .from('dim_location')
      .select('*, dim_warehouses(name)')

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
    }
    // Jika Superadmin memilih warehouse di dropdown filter
    if (whFilter) {
      dbQuery = dbQuery.eq('warehouse_id', whFilter)
    }

    const { data } = await dbQuery.order('name')
    locations = data || []

  } else {
    // 3. Query Admin Gudang (Hanya melihat gudangnya sendiri)
    const whId = profile.wh_id
    if (!whId) return <div>Warehouse tidak ditemukan</div>

    let dbQuery = supabase
      .from('dim_location')
      .select('*, dim_warehouses!inner(name)')
      .eq('warehouse_id', whId)

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
    }

    const { data } = await dbQuery.order('name')
    locations = data || []
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Location</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data rak dan area penyimpanan gudang.</p>
        </div>
        
        <AddLocationButton
          role={profile.role}
          warehouseId={profile.wh_id}
          warehouses={warehouses} // hanya untuk superadmin
        />
      </div>
      
      {/* Panggil Filter Bar di Atas Tabel */}
      <LocationFilterBar warehouses={warehouses} role={profile.role} />
      
      <LocationTable locations={locations} />
    </div>
  )
}