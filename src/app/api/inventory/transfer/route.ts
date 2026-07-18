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

    // 1. Validasi Input Dasar
    if (!warehouse_id || !product_id || !from_location_id || !qty || qty <= 0) {
      return NextResponse.json({ error: 'Data tidak lengkap atau qty tidak valid' }, { status: 400 })
    }

    // 2. Otorisasi
    if (profile.role !== 'superadmin' && profile.wh_id !== warehouse_id) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki akses ke gudang ini' }, { status: 403 })
    }

    const finalToLocationId = to_location_id || from_location_id
    const isSourceDamage = source_damage === true
    const isTargetDamage = target_damage === true

    // 3. Cek stok sumber dengan penanganan NULL yang benar
    let stockQuery = supabase
      .from('inv_warehouse_stock')
      .select('qty')
      .eq('warehouse_id', warehouse_id)
      .eq('product_id', product_id)
      .eq('location_id', from_location_id)
      .eq('is_damage', isSourceDamage)

    // Penanganan khusus untuk PostgreSQL saat membandingkan NULL
    if (source_inbound_header_id === null || source_inbound_header_id === undefined) {
      stockQuery = stockQuery.is('inbound_header_id', null)
    } else {
      stockQuery = stockQuery.eq('inbound_header_id', source_inbound_header_id)
    }

    const { data: sourceStock, error: fetchErr } = await stockQuery.maybeSingle()

    if (fetchErr) {
      console.error('Error fetching source stock:', fetchErr)
      return NextResponse.json({ error: 'Gagal memeriksa ketersediaan stok sumber' }, { status: 500 })
    }
    
    if (!sourceStock) {
      return NextResponse.json({ error: 'Data stok tidak ditemukan di lokasi asal' }, { status: 404 })
    }

    if (sourceStock.qty < qty) {
      return NextResponse.json({ error: `Stok tidak mencukupi (Tersedia: ${sourceStock.qty}, Diminta: ${qty})` }, { status: 400 })
    }

    // 4. Kurangi stok sumber menggunakan RPC
    const { error: decErr } = await supabase.rpc('upsert_inventory', {
      p_warehouse_id: warehouse_id,
      p_product_id: product_id,
      p_location_id: from_location_id,
      p_qty_change: -qty,
      p_is_damage: isSourceDamage,
      p_inbound_header_id: source_inbound_header_id || null, // Pastikan mengirim null jika undefined
    })
    
    if (decErr) {
      console.error('Error decreasing source:', decErr)
      return NextResponse.json({ error: 'Terjadi kesalahan saat mengurangi stok sumber' }, { status: 500 })
    }

    // 5. Tambah stok tujuan menggunakan RPC
    const { error: incErr } = await supabase.rpc('upsert_inventory', {
      p_warehouse_id: warehouse_id,
      p_product_id: product_id,
      p_location_id: finalToLocationId,
      p_qty_change: qty,
      p_is_damage: isTargetDamage,
      p_inbound_header_id: source_inbound_header_id || null,
    })

    if (incErr) {
      console.error('Error increasing destination:', incErr)
      // Rollback: kembalikan stok sumber jika penambahan ke tujuan gagal
      await supabase.rpc('upsert_inventory', {
        p_warehouse_id: warehouse_id,
        p_product_id: product_id,
        p_location_id: from_location_id,
        p_qty_change: qty, 
        p_is_damage: isSourceDamage,
        p_inbound_header_id: source_inbound_header_id || null,
      })
      return NextResponse.json({ error: 'Gagal memindahkan stok, sistem telah melakukan rollback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Transfer stok berhasil' }, { status: 200 })
    
  } catch (error: any) {
    console.error('Transfer inventory error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}