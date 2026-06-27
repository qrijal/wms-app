import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'DRAFT,PICKING'
    const statusList = status.split(',').map(s => s.trim())

    let query = supabase
      .from('outbound_header')
      .select('*, outbound_detail(count)')
      .in('status', statusList)
      .order('created_at', { ascending: false })

    // Batasi berdasarkan role
    if (profile.role === 'operator' || profile.role === 'admin') {
      query = query.eq('warehouse_id', profile.wh_id)
    } else if (profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}