import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    
    let query = supabase.from('dim_product_brand').select('*, dim_company(name)').order('name')
    
    // Admin hanya melihat brand yang company_id-nya sama dengan company warehouse atau NULL (global)
    if (profile.role === 'admin') {
      // Dapatkan company_id dari warehouse admin
      const { data: wh } = await supabase
        .from('dim_warehouses')
        .select('branch_id, dim_branch(company_id)')
        .eq('id', profile.wh_id)
        .single()
      if (wh?.dim_branch?.company_id) {
        query = query.or(`company_id.eq.${wh.dim_branch.company_id},company_id.is.null`)
      } else {
        query = query.is('company_id', null)
      }
    } else if (profile.role === 'superadmin') {
      if (companyId) query = query.eq('company_id', companyId)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { name, company_id } = await request.json()

    let finalCompanyId = company_id || null
    if (profile.role === 'admin') {
      // Admin otomatis mengambil company dari warehouse
      const { data: wh } = await supabase
        .from('dim_warehouses')
        .select('branch_id, dim_branch(company_id)')
        .eq('id', profile.wh_id)
        .single()
      finalCompanyId = wh?.dim_branch?.company_id || null
    }

    const { data, error } = await supabase
      .from('dim_product_brand')
      .insert({ name, company_id: finalCompanyId })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}