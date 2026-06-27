import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const {
      detail_id,
      location_id,
      qty_picked,
      is_damage = false,
      inbound_header_id,   // opsional, jika tidak diberikan → cari FIFO
    } = await request.json()

    // Validasi input
    if (!detail_id || !location_id || !qty_picked || qty_picked <= 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Ambil outbound detail & header
    const { data: detail, error: detailErr } = await supabase
      .from('outbound_detail')
      .select('*, outbound_header!inner(warehouse_id, status)')
      .eq('id', detail_id)
      .single()
    if (detailErr || !detail) {
      return NextResponse.json({ error: 'Detail outbound tidak ditemukan' }, { status: 404 })
    }

    // Validasi warehouse
    const warehouseId = detail.outbound_header.warehouse_id
    if (profile.role !== 'superadmin' && profile.wh_id !== warehouseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Hitung total picked yang sudah ada (termasuk hold yang sudah dilakukan)
    const { data: existingPickings } = await supabase
      .from('outbound_picking_detail')
      .select('qty_picked')
      .eq('detail_id', detail_id)

    const totalPicked = existingPickings?.reduce((sum, p) => sum + Number(p.qty_picked), 0) || 0
    const remainingOrder = detail.qty - totalPicked

    if (qty_picked > remainingOrder) {
      return NextResponse.json({
        error: `Qty picked melebihi sisa pesanan. Maksimal ${remainingOrder}`,
      }, { status: 400 })
    }

    // Cari stok di inventory (dengan FIFO jika inbound_header_id tidak diberikan)
    let targetStock: any = null

    if (inbound_header_id) {
      // Pilih stok spesifik berdasarkan inbound_header_id
      const { data: stock, error: stockErr } = await supabase
        .from('inv_warehouse_stock')
        .select('id, qty, hold_qty, inbound_header_id')
        .eq('warehouse_id', warehouseId)
        .eq('product_id', detail.product_id)
        .eq('location_id', location_id)
        .eq('is_damage', is_damage)
        .eq('inbound_header_id', inbound_header_id)
        .maybeSingle()

      if (stockErr) {
        console.error('Error fetching stock:', stockErr)
        return NextResponse.json({ error: 'Gagal memeriksa stok' }, { status: 500 })
      }
      targetStock = stock
    } else {
      // FIFO: cari stok terlama berdasarkan created_at inbound_header
      const { data: stocks, error: stocksErr } = await supabase
        .from('inv_warehouse_stock')
        .select('id, qty, hold_qty, inbound_header_id, inbound_header!inner(created_at)')
        .eq('warehouse_id', warehouseId)
        .eq('product_id', detail.product_id)
        .eq('location_id', location_id)
        .eq('is_damage', is_damage)
        .gt('qty', 0)                           // stok > 0
        .order('inbound_header(created_at)', { ascending: true }) // FIFO
        .limit(1)

      if (stocksErr) {
        console.error('Error fetching stocks:', stocksErr)
        return NextResponse.json({ error: 'Gagal memeriksa stok' }, { status: 500 })
      }
      if (stocks && stocks.length > 0) {
        targetStock = stocks[0]
      }
    }

    if (!targetStock) {
      return NextResponse.json({ error: 'Stok tidak tersedia di lokasi tersebut' }, { status: 400 })
    }

    const availableQty = targetStock.qty - targetStock.hold_qty
    if (availableQty < qty_picked) {
      return NextResponse.json({
        error: `Stok tersedia hanya ${availableQty} (total ${targetStock.qty}, hold ${targetStock.hold_qty})`,
      }, { status: 400 })
    }

    // Lakukan hold: tambah hold_qty
    const { error: holdErr } = await supabase
      .from('inv_warehouse_stock')
      .update({ hold_qty: targetStock.hold_qty + qty_picked })
      .eq('id', targetStock.id)

    if (holdErr) {
      console.error('Error updating hold_qty:', holdErr)
      return NextResponse.json({ error: 'Gagal menahan stok' }, { status: 500 })
    }

    // Insert picking detail
    const { data: pickingDetail, error: pickingErr } = await supabase
      .from('outbound_picking_detail')
      .insert({
        detail_id,
        location_id,
        inbound_header_id: targetStock.inbound_header_id,
        qty_picked,
        is_damage,
        user_id: profile.user.id,
      })
      .select()
      .single()

    if (pickingErr) {
      console.error('Error inserting picking detail:', pickingErr)
      // Rollback hold_qty
      await supabase
        .from('inv_warehouse_stock')
        .update({ hold_qty: targetStock.hold_qty })
        .eq('id', targetStock.id)
      return NextResponse.json({ error: 'Gagal mencatat picking' }, { status: 500 })
    }

    // Ubah status header jika masih DRAFT
    if (detail.outbound_header.status === 'DRAFT') {
      await supabase
        .from('outbound_header')
        .update({ status: 'PICKING' })
        .eq('id', detail.header_id)
    }

    // Update qty_picked di outbound_detail (opsional, bisa dihitung dari picking_details)
    const newTotalPicked = totalPicked + qty_picked
    await supabase
      .from('outbound_detail')
      .update({ qty_picked: newTotalPicked })
      .eq('id', detail_id)

    return NextResponse.json({ success: true, picking_detail: pickingDetail })
  } catch (error: any) {
    console.error('Picking error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}