import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import ProductTable from './ProductTable'
import AddProductButton from './AddProductButton'
import ProductFilterBar from './ProductFilterBar' // <--- Import Komponen Filter Baru

export default async function MasterProductPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; wh?: string }> // Parameter pencarian & filter
}) {
  const profile = await getUserProfile()
  const supabase = await createClient()

  // Tangkap query dari URL
  const resolvedParams = await searchParams
  const query = resolvedParams?.q || ''
  const whFilter = resolvedParams?.wh || ''

  let products: any[] = []
  let brands: any[] = []
  let uoms: any[] = []
  let warehouses: any[] = []

  if (profile.role === 'superadmin') {
    // 1. Ambil Data Master untuk Form
    const { data: brandData } = await supabase.from('dim_product_brand').select('*').order('name')
    brands = brandData || []
    const { data: uomData } = await supabase.from('dim_product_uom').select('id, name').order('name')
    uoms = uomData || []
    const { data: whData } = await supabase.from('dim_warehouses').select('id, name').order('name')
    warehouses = whData || []

    // 2. Query Utama Produk (Superadmin)
    let dbQuery = supabase
      .from('dim_products')
      .select('*, dim_product_brand(name), dim_product_uom(name), dim_warehouses(name)')

    // Pencarian berdasarkan nama atau kode produk
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,product_code.ilike.%${query}%`)
    }
    // Filter berdasarkan Dropdown Warehouse
    if (whFilter) {
      dbQuery = dbQuery.eq('warehouse_id', whFilter)
    }

    const { data: prodData } = await dbQuery.order('name')
    products = prodData || []

  } else {
    // 3. Query Utama Produk (Admin Gudang)
    const whId = profile.wh_id
    if (!whId) return <div>Warehouse tidak valid</div>

    let dbQuery = supabase
      .from('dim_products')
      .select('*, dim_product_brand(name), dim_product_uom(name)')
      .eq('warehouse_id', whId) // Kunci data hanya untuk gudang miliknya

    // Pencarian berdasarkan nama atau kode produk
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,product_code.ilike.%${query}%`)
    }

    const { data: prodData } = await dbQuery.order('name')
    products = prodData || []

    // Ambil data referensi (Brand & UOM)
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
      {/* Header Halaman yang Fleksibel (Mirip Master Location) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Product</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data Master SKU (Produk), UOM, dan Merek.</p>
        </div>
        
        <AddProductButton
          role={profile.role}
          brands={brands}
          uoms={uoms}
          warehouses={warehouses}
        />
      </div>

      {/* Baris Filter (Pencarian & Dropdown Warehouse) */}
      <ProductFilterBar warehouses={warehouses} role={profile.role} />

      <ProductTable products={products} showWarehouse={profile.role === 'superadmin'} />
    </div>
  )
}