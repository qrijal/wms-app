import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import BrandTable from './BrandTable'
import AddBrandButton from './AddBrandButton'

export default async function BrandsPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  let brands: any[] = []
  let companies: any[] = []

  if (profile.role === 'superadmin') {
    const { data } = await supabase
      .from('dim_product_brand')
      .select('*, dim_company(name)')
      .order('name')
    brands = data || []
    const { data: compData } = await supabase.from('dim_company').select('id, name').order('name')
    companies = compData || []
  } else {
    const { data: wh } = await supabase
      .from('dim_warehouses')
      .select('branch_id, dim_branch(company_id)')
      .eq('id', profile.wh_id)
      .single()
    const companyId = wh?.dim_branch?.company_id
    const { data } = await supabase
      .from('dim_product_brand')
      .select('*, dim_company(name)')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order('name')
    brands = data || []
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Brands</h1>
        <AddBrandButton role={profile.role} companies={companies} />
      </div>
      <BrandTable brands={brands} />
    </div>
  )
}