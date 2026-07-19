// src/app/api/inbound/header/[headerId]/grn/route.ts
import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ headerId: string }> }
) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { headerId } = await params

    // 1. Validasi header
    const { data: header, error: headerErr } = await supabase
      .from('inbound_header')
      .select('id, warehouse_id, status')
      .eq('id', headerId)
      .single()
    if (headerErr || !header) throw new Error('Header tidak ditemukan')
    if (header.warehouse_id !== profile.wh_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (header.status !== 'PUTAWAY' && header.status !== 'RECEIVING') {
      return NextResponse.json({ error: 'Status harus PUTAWAY atau RECEIVING' }, { status: 400 })
    }

    // 2. Ambil data putaway dengan join yang lebih sederhana
    // 2. Ambil data putaway dengan relasi yang sesuai skema
    const { data: putawayItems, error: putawayErr } = await supabase
      .from('inbound_putaway_detail')
      .select(`
        qty,
        location_id,
        inbound_receiving_detail!inner (
          is_damage,
          pallet_id,
          inbound_detail_id,
          inbound_detail!inner (
            header_id,
            product_id,
            product_code,
            batch_number 
          )
        )
      `)
      .eq('inbound_receiving_detail.inbound_detail.header_id', headerId)

    if (putawayErr) {
      console.error('Error fetching putaway:', putawayErr)
      return NextResponse.json({ error: 'Gagal mengambil data putaway' }, { status: 500 })
    }
    if (!putawayItems || putawayItems.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data putaway' }, { status: 400 })
    }

    // 3. Update stok untuk setiap alokasi
    for (const item of putawayItems) {
      const inboundReceivingDetail = Array.isArray(item.inbound_receiving_detail)
        ? item.inbound_receiving_detail[0]
        : item.inbound_receiving_detail

      const inbDetail = inboundReceivingDetail?.inbound_detail as any
      const productId = Array.isArray(inbDetail) ? inbDetail[0]?.product_id : inbDetail?.product_id
      const palletId = inboundReceivingDetail?.pallet_id

      if (!productId) {
        console.error('Missing product_id in item:', item)
        continue
      }

      const isDamage = inboundReceivingDetail?.is_damage ?? false

      // Mengirim ke database
      const { error: rpcErr } = await supabase.rpc('upsert_inventory', {
        p_warehouse_id: header.warehouse_id,
        p_product_id: productId,
        p_location_id: item.location_id,
        p_qty_change: item.qty,
        p_is_damage: isDamage,
        p_inbound_header_id: headerId,
        p_pallet_id: palletId || '',
      })

      if (rpcErr) {
        console.error('RPC error:', rpcErr)
        return NextResponse.json({ error: `Gagal update stok: ${rpcErr.message}` }, { status: 500 })
      }
    }

    // 4. Tandai header sebagai GRN
    await supabase.from('inbound_header').update({ status: 'GRN' }).eq('id', headerId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('GRN error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}