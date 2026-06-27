import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { ref_no, notes, items } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Daftar item transfer diperlukan' }, { status: 400 })
    }

    // Buat header
    const { data: header, error: headerErr } = await supabase
      .from('tf_location_header')
      .insert({
        warehouse_id: profile.wh_id,
        ref_no: ref_no || null,
        notes: notes || null,
        user_id: profile.user.id,
        status: 'CONFIRMED' // langsung confirmed karena tidak ada receiving
      })
      .select('id')
      .single()
    if (headerErr) throw headerErr

    // Insert detail & update stok
    for (const item of items) {
      const { data: detail, error: detErr } = await supabase
        .from('tf_location_detail')
        .insert({
          header_id: header.id,
          product_id: item.product_id,
          product_code: item.product_code,
          from_location_id: item.from_location_id,
          to_location_id: item.to_location_id,
          qty: item.qty,
        })
        .select()
        .single()
      if (detErr) throw detErr

      // Kurangi stok asal
      await supabase.rpc('upsert_inventory', {
        p_warehouse_id: profile.wh_id,
        p_product_id: item.product_id,
        p_location_id: item.from_location_id,
        p_qty_change: -item.qty,
      })

      // Tambah stok tujuan
      await supabase.rpc('upsert_inventory', {
        p_warehouse_id: profile.wh_id,
        p_product_id: item.product_id,
        p_location_id: item.to_location_id,
        p_qty_change: item.qty,
      })
    }

    return NextResponse.json({ success: true, header_id: header.id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}