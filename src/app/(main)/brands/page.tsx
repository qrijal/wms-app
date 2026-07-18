import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import BrandTable from './BrandTable'
import AddBrandButton from './AddBrandButton'

export default async function BrandsPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  let brands: any[] = []
  let warehouses: any[] = []

  let query = supabase
    .from('dim_product_brand')
    .select('id, name, warehouse_id, dim_warehouses(name)')
    .order('name')

  if (profile.role === 'superadmin') {
    const { data } = await query
    brands = data || []
    
    const { data: whData } = await supabase.from('dim_warehouses').select('id, name').order('name')
    warehouses = whData || []
  } else {
    // Admin filter
    const { data } = await query.or(`warehouse_id.eq.${profile.wh_id},warehouse_id.is.null`)
    brands = data || []
  }

  // Format data untuk tabel
  const formattedBrands = brands.map(b => ({
    id: b.id,
    name: b.name,
    warehouse_name: b.dim_warehouses?.name || 'Global',
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Brand</h1>
        </div>
        <AddBrandButton role={profile.role} warehouses={warehouses} />
      </div>
      
      <BrandTable brands={formattedBrands} />
    </div>
  )
}