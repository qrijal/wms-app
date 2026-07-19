//src\app\api\inbound\header\[headerId]\details\route.ts
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

    // Ambil header
    const { data: header, error: headerErr } = await supabase
      .from('inbound_header')
      .select('*')
      .eq('id', headerId)
      .single()

    if (headerErr || !header) {
      return NextResponse.json({ error: 'Header tidak ditemukan' }, { status: 404 })
    }

    if (profile.role !== 'superadmin' && header.warehouse_id !== profile.wh_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ambil semua inbound_detail untuk header ini
    const { data: details, error: detailsErr } = await supabase
      .from('inbound_detail')
      .select('*, dim_products(name)')
      .eq('header_id', headerId)
      .order('id')

    if (detailsErr) throw detailsErr

    // Untuk setiap detail, ambil total receiving & putaway
    const enrichedDetails = await Promise.all((details || []).map(async (detail) => {
      // Total qty_received (dari inbound_receiving_detail)
      const { data: receivingSum } = await supabase
        .from('inbound_receiving_detail')
        .select('qty_received')
        .eq('inbound_detail_id', detail.id)

      const totalReceived = receivingSum?.reduce((sum, r) => sum + Number(r.qty_received), 0) || 0

      // Total qty_putaway (melalui join ke inbound_receiving_detail)
      const { data: putawaySum } = await supabase
        .from('inbound_putaway_detail')
        .select('qty, inbound_receiving_detail!inner(inbound_detail_id)')
        .eq('inbound_receiving_detail.inbound_detail_id', detail.id)

      const totalPutaway = putawaySum?.reduce((sum, p) => sum + Number(p.qty), 0) || 0

      // Ambil detail receiving dan putaway untuk ditampilkan di frontend
      const { data: receivingDetails } = await supabase
        .from('inbound_receiving_detail')
        .select('id, qty_received, is_damage, created_at')
        .eq('inbound_detail_id', detail.id)
        .order('created_at')

      const { data: putawayDetails } = await supabase
        .from('inbound_putaway_detail')
        .select('id, receiving_detail_id, location_id, qty, dim_location(name, barcode)')
        .in('receiving_detail_id', (receivingDetails || []).map(r => r.id))

      return {
        ...detail,
        qty_received: totalReceived,
        qty_putaway: totalPutaway,
        receiving_details: receivingDetails || [],
        putaway_details: putawayDetails || [],
      }
    }))

    return NextResponse.json({ status: header.status, details: enrichedDetails })
  } catch (error: any) {
    console.error('Error get details:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}