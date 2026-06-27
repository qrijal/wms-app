import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ headerId: string }> }
) {
  try {
    const { headerId } = await params
    const profile = await getUserProfile()
    const supabase = await createClient()

    const { data: header } = await supabase
      .from('outbound_header')
      .select('*')
      .eq('id', headerId)
      .single()

    if (!header) return NextResponse.json({ error: 'Header tidak ditemukan' }, { status: 404 })
    if (profile.role !== 'superadmin' && header.warehouse_id !== profile.wh_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ambil detail
    const { data: details } = await supabase
      .from('outbound_detail')
      .select('*, dim_products(name)')
      .eq('header_id', headerId)
      .order('id')

    // Ambil picking details (jika ada)
    let detailsWithPicking = details || []
    if (details && details.length > 0) {
      const detailIds = details.map(d => d.id)
      const { data: pickingData } = await supabase
        .from('outbound_picking_detail')
        .select('*, dim_location(name, barcode)')
        .in('detail_id', detailIds)

      detailsWithPicking = details.map(detail => ({
        ...detail,
        picking_details: pickingData?.filter(p => p.detail_id === detail.id) || [],
      }))
    }

    return NextResponse.json({ status: header.status, details: detailsWithPicking })
  } catch (error: any) {
    console.error('Error get outbound details:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}