import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import UomPairTable from './UomPairTable'
import AddUomPairButton from './AddUomPairButton'

export default async function UomsPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  // Ambil pasangan UOM dari API
  let pairs: any[] = []
  if (profile.role === 'superadmin') {
    const { data } = await supabase
      .from('dim_product_uom')
      .select(`
        id, name, conversion_factor, company_id,
        primary_uom:base_uom_id (name),
        dim_company (name)
      `)
      .eq('is_primary', false)
      .not('base_uom_id', 'is', null)
      .order('name')
    pairs = (data || []).map(item => ({
      id: item.id,
      secondary_name: item.name,
      conversion_factor: item.conversion_factor,
      primary_name: item.primary_uom?.name || '',
      company_name: item.dim_company?.name || 'Global',
    }))
  } else {
    // Admin: filter by company dari warehouse
    const { data: wh } = await supabase
      .from('dim_warehouses')
      .select('branch_id, dim_branch(company_id)')
      .eq('id', profile.wh_id)
      .single()
    const companyId = wh?.dim_branch?.company_id

    const { data } = await supabase
      .from('dim_product_uom')
      .select(`
        id, name, conversion_factor, company_id,
        primary_uom:base_uom_id (name),
        dim_company (name)
      `)
      .eq('is_primary', false)
      .not('base_uom_id', 'is', null)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order('name')
    pairs = (data || []).map(item => ({
      id: item.id,
      secondary_name: item.name,
      conversion_factor: item.conversion_factor,
      primary_name: item.primary_uom?.name || '',
      company_name: item.dim_company?.name || 'Global',
    }))
  }

  // Untuk dropdown company (superadmin)
  let companies: any[] = []
  if (profile.role === 'superadmin') {
    const { data: compData } = await supabase.from('dim_company').select('id, name').order('name')
    companies = compData || []
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Konversi Satuan (UOM)</h1>
        <AddUomPairButton role={profile.role} companies={companies} />
      </div>
      <UomPairTable pairs={pairs} />
    </div>
  )
}