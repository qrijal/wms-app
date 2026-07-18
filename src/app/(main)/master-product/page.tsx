import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import ProductTable from './ProductTable'
import AddProductButton from './AddProductButton'

export default async function MasterProductPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  let products: any[] = []
  let brands: any[] = []
  let uoms: any[] = []
  let warehouses: any[] = []

  if (profile.role === 'superadmin') {
    const { data: prodData } = await supabase
      .from('dim_products')
      .select('*, dim_product_brand(name), dim_product_uom(name), dim_warehouses(name)')
      .order('name')
    products = prodData || []

    const { data: brandData } = await supabase.from('dim_product_brand').select('*').order('name')
    brands = brandData || []

    const { data: uomData } = await supabase.from('dim_product_uom').select('id, name').order('name')
    uoms = uomData || []

    const { data: whData } = await supabase.from('dim_warehouses').select('id, name').order('name')
    warehouses = whData || []
  } else {
    const whId = profile.wh_id
    if (!whId) return <div>Warehouse tidak valid</div>

    // Ambil produk berdasarkan warehouse_id
    const { data: prodData } = await supabase
      .from('dim_products')
      .select('*, dim_product_brand(name), dim_product_uom(name)')
      .eq('warehouse_id', whId)
      .order('name')
    products = prodData || []

    const { data: brandData } = await supabase
      .from('dim_product_brand')
      .select('*')
      .or(`warehouse_id.eq.${whId},warehouse_id.is.null`)
      .order('name')
    brands = brandData || []

    const { data: uomData } = await supabase
      .from('dim_product_uom')
      .select('id, name')
      .or(`warehouse_id.eq.${whId},warehouse_id.is.null`)
      .order('name')
    uoms = uomData || []
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Master Product</h1>
        <AddProductButton
          role={profile.role}
          brands={brands}
          uoms={uoms}
          warehouses={warehouses}
        />
      </div>
      <ProductTable products={products} showWarehouse={profile.role === 'superadmin'} />
    </div>
  )
}