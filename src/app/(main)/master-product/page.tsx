import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import ProductTable from './ProductTable'
import AddProductButton from './AddProductButton'

export default async function MasterProductPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  // Ambil produk sesuai role
  let products: any[] = []
  if (profile.role === 'superadmin') {
    const { data } = await supabase
      .from('dim_products')
      .select('*, dim_product_brand(name), dim_product_uom!inner(name, conversion_factor, base_uom_id (name)), dim_branch(name)')
      .order('name')
    products = data || []
  } else {
    const whId = profile.wh_id
    if (!whId) return <div>Warehouse tidak ditemukan</div>

    const { data: warehouse, error: whError } = await supabase
      .from('dim_warehouses')
      .select('branch_id')
      .eq('id', whId)
      .maybeSingle()

    if (whError) {
      console.error('Error mengambil warehouse:', whError)
      return <div>Gagal membaca data warehouse: {whError.message}</div>
    }
    if (!warehouse) return <div>Warehouse tidak valid</div>

    const { data, error: productsError } = await supabase
      .from('dim_products')
      .select('*, dim_product_brand(name), dim_product_uom!inner(name, conversion_factor, base_uom_id (name))')
      .eq('branch_id', warehouse.branch_id)
      .order('name')

    if (productsError) {
      console.error('Error mengambil produk:', productsError)
      return <div>Gagal memuat data produk: {productsError.message}</div>
    }
    products = data || []
  }

  // Ambil brands (semua untuk dropdown)
  const { data: brands, error: brandsError } = await supabase.from('dim_product_brand').select('*').order('name')
  if (brandsError) console.error('Error mengambil brands:', brandsError)

  // Ambil hanya UOM SECONDARY
  let uomSecondary: any[] = []
  if (profile.role === 'superadmin') {
    const { data, error: uomError } = await supabase
      .from('dim_product_uom')
      .select('*, base:base_uom_id(name)')
      .eq('is_primary', false)
      .not('base_uom_id', 'is', null)
      .order('name')
    if (uomError) console.error('Error mengambil UOM:', uomError)
    uomSecondary = data || []
  } else {
    // Admin
    const whId = profile.wh_id
    if (!whId) return <div>Warehouse tidak ditemukan</div>

    const { data: wh, error: whErr } = await supabase
      .from('dim_warehouses')
      .select('branch_id, dim_branch(company_id)')
      .eq('id', whId)
      .maybeSingle()

    if (whErr) {
      console.error('Error mengambil warehouse (company):', whErr)
      return <div>Gagal membaca data warehouse: {whErr.message}</div>
    }
    if (!wh) return <div>Warehouse tidak ditemukan</div>

    const companyId = wh?.dim_branch?.company_id

    // Query pertama: UOM dengan company_id = companyId (jika ada)
    let query1 = supabase
      .from('dim_product_uom')
      .select('*, base:base_uom_id(name)')
      .eq('is_primary', false)
      .not('base_uom_id', 'is', null)
      .order('name')

    // Query kedua: UOM global (company_id IS NULL) – kecuali companyId sendiri null
    let query2 = companyId
      ? supabase
          .from('dim_product_uom')
          .select('*, base:base_uom_id(name)')
          .eq('is_primary', false)
          .not('base_uom_id', 'is', null)
          .is('company_id', null)
          .order('name')
      : null

    if (companyId) {
      query1 = query1.eq('company_id', companyId)
    } else {
      query1 = query1.is('company_id', null)
    }

    const [{ data: data1, error: err1 }, { data: data2, error: err2 }] = await Promise.all([
      query1,
      query2 ? query2 : Promise.resolve({ data: [], error: null }),
    ])

    if (err1 || err2) {
      console.error('Error ambil UOM:', err1 || err2)
      return <div>Gagal memuat UOM</div>
    }

    const merged = [...(data1 || []), ...(data2 || [])]
    // Hapus duplikat berdasarkan id (jika ada yang overlap)
    uomSecondary = merged.filter((item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
    )
  }

  // Data branch untuk superadmin
  let branches: any[] = []
  if (profile.role === 'superadmin') {
    const { data } = await supabase.from('dim_branch').select('id, name').order('name')
    branches = data || []
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Master Product</h1>
        <AddProductButton
          role={profile.role}
          warehouseId={profile.wh_id}
          brands={brands || []}
          uoms={uomSecondary}
          branches={branches}
        />
      </div>
      <ProductTable products={products} showBranch={profile.role === 'superadmin'} />
    </div>
  )
}