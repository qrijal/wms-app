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
    const { nopol, nama_driver } = await request.json()

    // 1. Validasi header
    const { data: header, error: headerErr } = await supabase
      .from('outbound_header')
      .select('id, warehouse_id, status')
      .eq('id', headerId)
      .single()
    if (headerErr || !header) throw new Error('Header tidak ditemukan')
    if (header.warehouse_id !== profile.wh_id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (header.status !== 'PICKING')
      return NextResponse.json({ error: 'Status harus PICKING untuk dispatch' }, { status: 400 })

    // 2. Validasi nopol & driver
    if (!nopol?.trim() || !nama_driver?.trim()) {
      return NextResponse.json({ error: 'No. Polisi dan Nama Driver harus diisi' }, { status: 400 })
    }

    // 3. Update nopol & driver di header
    const { error: updateHeaderErr } = await supabase
      .from('outbound_header')
      .update({ nopol: nopol.trim(), nama_driver: nama_driver.trim() })
      .eq('id', headerId)
    if (updateHeaderErr) {
      console.error('Error updating header:', updateHeaderErr)
      return NextResponse.json({ error: 'Gagal menyimpan data driver' }, { status: 500 })
    }

    // 4. Ambil semua picking details untuk header ini
    const { data: pickingDetails, error: pickErr } = await supabase
      .from('outbound_picking_detail')
      .select('*, outbound_detail!inner(product_id, header_id)')
      .eq('outbound_detail.header_id', headerId)

    if (pickErr) {
      console.error('Error fetching picking details:', pickErr)
      return NextResponse.json({ error: 'Gagal mengambil data picking' }, { status: 500 })
    }
    if (!pickingDetails || pickingDetails.length === 0) {
      return NextResponse.json({ error: 'Belum ada picking' }, { status: 400 })
    }

    // 5. Kurangi stok dan reset hold_qty untuk setiap picking detail
    for (const pick of pickingDetails) {
      const { data: stockRow, error: stockErr } = await supabase
        .from('inv_warehouse_stock')
        .select('id, qty, hold_qty')
        .eq('warehouse_id', header.warehouse_id)
        .eq('product_id', pick.outbound_detail.product_id)
        .eq('location_id', pick.location_id)
        .eq('is_damage', pick.is_damage)
        .eq('inbound_header_id', pick.inbound_header_id)
        .maybeSingle()

      if (stockErr) {
        console.error('Error fetching stock row:', stockErr)
        return NextResponse.json({ error: 'Gagal memeriksa stok' }, { status: 500 })
      }
      if (!stockRow) continue

      const newQty = stockRow.qty - pick.qty_picked
      const newHold = stockRow.hold_qty - pick.qty_picked

      const { error: updateStockErr } = await supabase
        .from('inv_warehouse_stock')
        .update({
          qty: newQty >= 0 ? newQty : 0,
          hold_qty: newHold >= 0 ? newHold : 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stockRow.id)

      if (updateStockErr) {
        console.error('Error updating stock:', updateStockErr)
        return NextResponse.json({ error: 'Gagal mengupdate stok' }, { status: 500 })
      }
    }

    // 6. Ubah status menjadi DISPATCHED
    const { error: statusErr } = await supabase
      .from('outbound_header')
      .update({ status: 'DISPATCHED' })
      .eq('id', headerId)
    if (statusErr) {
      console.error('Error updating status:', statusErr)
      return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Dispatch error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}