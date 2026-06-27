import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    await requireSuperadmin()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')

    let query = supabase
      .from('dim_warehouses')
      .select('*, dim_branch(name)')
      .order('name')

    if (branchId) {
      query = query.eq('branch_id', branchId)
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
    const { name, branch_id, location } = await request.json()
    if (!name || !branch_id) {
      return NextResponse.json({ error: 'Nama dan branch_id diperlukan' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('dim_warehouses')
      .insert({ name, branch_id, location: location || null })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}