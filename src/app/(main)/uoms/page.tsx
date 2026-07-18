import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import UomTable from './UomTable'
import AddUomButton from './AddUomButton'

export default async function UomsPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  let uoms: any[] = []
  let warehouses: any[] = []

  // Membuat query dasar
  let query = supabase
    .from('dim_product_uom')
    .select(`
      id, 
      name, 
      warehouse_id,
      dim_warehouses (name)
    `)
    .order('name')

  // Filter untuk admin (tampilkan milik sendiri atau Global/NULL)
  if (profile.role === 'admin') {
    query = query.or(`warehouse_id.eq.${profile.wh_id},warehouse_id.is.null`)
  }

  const { data } = await query

  // Mapping data ke format yang dibutuhkan tabel
  uoms = (data || []).map(item => ({
    id: item.id,
    name: item.name,
    warehouse_name: item.dim_warehouses?.name || item.dim_warehouses?.[0]?.name || 'Global',
  }))

  // Ambil daftar warehouse untuk dropdown superadmin
  if (profile.role === 'superadmin') {
    const { data: whData } = await supabase.from('dim_warehouses').select('id, name').order('name')
    warehouses = whData || []
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Satuan (UOM)</h1>
        <AddUomButton role={profile.role} warehouses={warehouses} />
      </div>
      <UomTable uoms={uoms} />
    </div>
  )
}