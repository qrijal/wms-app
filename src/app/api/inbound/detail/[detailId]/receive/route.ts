//src\app\api\inbound\detail\[detailId]\receive\route.ts
import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ detailId: string }> }
) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { qty_received, is_damage = false } = await request.json()
    const { detailId } = await params

    // Validasi input
    if (!qty_received || qty_received <= 0) {
      return NextResponse.json({ error: 'qty_received harus > 0' }, { status: 400 })
    }

    // Ambil detail dan header terkait
    const { data: detail, error: detailErr } = await supabase
      .from('inbound_detail')
      .select('*, inbound_header!inner(id, warehouse_id, status)')
      .eq('id', detailId)
      .single()

    if (detailErr || !detail) {
      return NextResponse.json({ error: 'Detail tidak ditemukan' }, { status: 404 })
    }

    // Validasi warehouse
    if (detail.inbound_header.warehouse_id !== profile.wh_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Insert ke inbound_receiving_detail
    const { error: insertErr } = await supabase
      .from('inbound_receiving_detail')
      .insert({
        inbound_detail_id: detailId,
        qty_received,
        is_damage,
        user_id: profile.user.id,
      })

    if (insertErr) {
      console.error('Error insert receiving:', insertErr)
      return NextResponse.json({ error: 'Gagal mencatat penerimaan' }, { status: 500 })
    }

    // Ubah status header menjadi RECEIVING jika masih DRAFT
    if (detail.inbound_header.status === 'DRAFT') {
      await supabase
        .from('inbound_header')
        .update({ status: 'RECEIVING' })
        .eq('id', detail.inbound_header.id)
    }

    // Catat scan_log
    await supabase.from('scan_log').insert({
      transaction_type: 'INBOUND_RECEIVE',
      transaction_detail_id: detailId,
      product_id: detail.product_id,
      product_code: detail.product_code,
      user_id: profile.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Receive error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}