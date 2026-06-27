import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { receiving_detail_id, location_id, qty } = await request.json()

    if (!receiving_detail_id || !location_id || !qty || qty <= 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Validasi bahwa receiving_detail_id terkait dengan warehouse user
    const { data: receiving, error: receivingErr } = await supabase
      .from('inbound_receiving_detail')
      .select('*, inbound_detail!inner(header_id, product_id)')
      .eq('id', receiving_detail_id)
      .single()

    if (receivingErr || !receiving) {
      return NextResponse.json({ error: 'Data penerimaan tidak ditemukan' }, { status: 404 })
    }

    // Dapatkan header untuk validasi warehouse
    const { data: header } = await supabase
      .from('inbound_header')
      .select('id, warehouse_id, status')
      .eq('id', receiving.inbound_detail.header_id)
      .single()

    if (!header || header.warehouse_id !== profile.wh_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Hitung total putaway yang sudah ada untuk receiving_detail_id ini
    const { data: existingPutaway } = await supabase
      .from('inbound_putaway_detail')
      .select('qty')
      .eq('receiving_detail_id', receiving_detail_id)

    const totalPutaway = existingPutaway?.reduce((sum, row) => sum + Number(row.qty), 0) || 0
    const remaining = receiving.qty_received - totalPutaway

    if (qty > remaining) {
      return NextResponse.json({ error: `Maksimal ${remaining} unit` }, { status: 400 })
    }

    // Insert putaway
    const { error: insertErr } = await supabase
      .from('inbound_putaway_detail')
      .insert({
        receiving_detail_id,
        location_id,
        qty,
        user_id: profile.user.id,
      })

    if (insertErr) {
      console.error('Error insert putaway:', insertErr)
      return NextResponse.json({ error: 'Gagal mencatat putaway' }, { status: 500 })
    }

    // Ubah status header menjadi PUTAWAY jika masih RECEIVING
    if (header.status === 'RECEIVING') {
      await supabase
        .from('inbound_header')
        .update({ status: 'PUTAWAY' })
        .eq('id', header.id)
    }

    // Scan log
    await supabase.from('scan_log').insert({
      transaction_type: 'INBOUND_PUTAWAY',
      transaction_detail_id: receiving.inbound_detail.header_id, // atau detail id
      product_id: receiving.inbound_detail.product_id,
      location_id,
      product_code: null, // bisa diambil dari inbound_detail jika perlu
      user_id: profile.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Putaway error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}