import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    await requireSuperadmin()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')

    let query = supabase
      .from('dim_branch')
      .select('*, dim_company(name)')
      .order('name')

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperadmin()
    const supabase = await createClient()
    const { name, company_id } = await request.json()
    if (!name || !company_id) {
      return NextResponse.json({ error: 'Nama dan company_id diperlukan' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('dim_branch')
      .insert({ name, company_id })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}