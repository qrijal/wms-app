import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode diperlukan' }, { status: 400 })
    }

    let query = supabase
      .from('dim_location')
      .select('*')
      .eq('barcode', barcode)

    // Batasi ke warehouse user (kecuali superadmin)
    if (profile.role === 'admin' || profile.role === 'operator') {
      query = query.eq('warehouse_id', profile.wh_id)
    }

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}