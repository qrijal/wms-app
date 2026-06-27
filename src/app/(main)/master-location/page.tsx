import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import LocationTable from './LocationTable'
import AddLocationButton from './AddLocationButton'

export default async function MasterLocationPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  let locations: any[] = []
  let warehouses: any[] = []

  if (profile.role === 'superadmin') {
    // Superadmin melihat semua lokasi (atau bisa difilter nanti)
    const { data } = await supabase
      .from('dim_location')
      .select('*, dim_warehouses(name)')
      .order('name')
    locations = data || []

    // Untuk dropdown warehouse di modal tambah
    const { data: whData } = await supabase
      .from('dim_warehouses')
      .select('id, name')
      .order('name')
    warehouses = whData || []
  } else {
    // Admin hanya melihat lokasi di warehouse sendiri
    const whId = profile.wh_id
    if (!whId) return <div>Warehouse tidak ditemukan</div>

    const { data } = await supabase
      .from('dim_location')
      .select('*, dim_warehouses!inner(name)')
      .eq('warehouse_id', whId)
      .order('name')
    locations = data || []
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Master Location</h1>
        <AddLocationButton
          role={profile.role}
          warehouseId={profile.wh_id}
          warehouses={warehouses} // hanya untuk superadmin
        />
      </div>
      <LocationTable locations={locations} />
    </div>
  )
}