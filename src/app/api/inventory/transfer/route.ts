// src/app/api/inventory/transfer/route.ts
import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const {
      warehouse_id,
      product_id,
      from_location_id,
      to_location_id,
      qty,
      source_damage,
      target_damage,
      source_inbound_header_id,
    } = await request.json()

    if (!warehouse_id || !product_id || !from_location_id || !qty || qty <= 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    if (profile.role !== 'superadmin' && profile.wh_id !== warehouse_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const finalToLocationId = to_location_id || from_location_id

    // 1. Cek stok sumber
    const { data: sourceStock, error: fetchErr } = await supabase
      .from('inv_warehouse_stock')
      .select('qty')
      .eq('warehouse_id', warehouse_id)
      .eq('product_id', product_id)
      .eq('location_id', from_location_id)
      .eq('is_damage', source_damage === true)
      .eq('inbound_header_id', source_inbound_header_id)
      .maybeSingle()

    if (fetchErr) {
      console.error('Error fetching source stock:', fetchErr)
      return NextResponse.json({ error: 'Gagal memeriksa stok sumber' }, { status: 500 })
    }
    if (!sourceStock || sourceStock.qty < qty) {
      return NextResponse.json({ error: 'Stok sumber tidak mencukupi' }, { status: 400 })
    }

    // 2. Kurangi stok sumber menggunakan upsert_inventory (dengan parameter inbound_header_id)
    const { error: decErr } = await supabase.rpc('upsert_inventory', {
      p_warehouse_id: warehouse_id,
      p_product_id: product_id,
      p_location_id: from_location_id,
      p_qty_change: -qty,
      p_is_damage: source_damage === true,
      p_inbound_header_id: source_inbound_header_id,
    })
    if (decErr) {
      console.error('Error decreasing source:', decErr)
      return NextResponse.json({ error: 'Gagal mengurangi stok sumber' }, { status: 500 })
    }

    // 3. Tambah stok tujuan menggunakan upsert_inventory (positif, dengan target_damage)
    const { error: incErr } = await supabase.rpc('upsert_inventory', {
      p_warehouse_id: warehouse_id,
      p_product_id: product_id,
      p_location_id: finalToLocationId,
      p_qty_change: qty,
      p_is_damage: target_damage === true,
      p_inbound_header_id: source_inbound_header_id, // tetap membawa jejak inbound
    })
    if (incErr) {
      console.error('Error increasing destination:', incErr)
      // Rollback pengurangan stok sumber
      await supabase.rpc('upsert_inventory', {
        p_warehouse_id: warehouse_id,
        p_product_id: product_id,
        p_location_id: from_location_id,
        p_qty_change: qty, // kembalikan
        p_is_damage: source_damage === true,
        p_inbound_header_id: source_inbound_header_id,
      })
      return NextResponse.json({ error: 'Gagal menambah stok tujuan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Transfer inventory error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}