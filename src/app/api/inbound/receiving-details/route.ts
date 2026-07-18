// src/app/api/inbound/receiving-details/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── METHOD GET (Untuk menarik histori) ────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('detail_ids')
  if (!ids) return NextResponse.json([])

  const idArray = ids.split(',').map(Number).filter(n => !isNaN(n))
  if (idArray.length === 0) return NextResponse.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbound_receiving_detail')
    // Perbaikan: pallet_id ditambahkan ke dalam select()
    .select('id, inbound_detail_id, pallet_id, qty_received, is_damage, created_at')
    .in('inbound_detail_id', idArray)

  if (error) {
    console.error('Error get receiving details:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ─── METHOD POST (Untuk Bulk Insert dari Modal UI) ─────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, headerId } = body // Tambahkan headerId dari frontend

    if (!items || !headerId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Bulk Insert Receiving Details
    const { data: insertedData, error: insertError } = await supabase
      .from('inbound_receiving_detail')
      .insert(items.map((i: any) => ({
        inbound_detail_id: i.detail_id,
        qty_received: i.qty_received,
        is_damage: i.is_damage
      })))
      .select('id, inbound_detail_id, pallet_id, qty_received, is_damage, created_at')

    if (insertError) throw insertError

    // 2. Update status header (Hanya jika status saat ini DRAFT)
    const { error: updateError } = await supabase
      .from('inbound_header')
      .update({ status: 'RECEIVING' })
      .eq('id', headerId)
      .eq('status', 'DRAFT') // Mencegah update berulang jika sudah RECEIVING

    if (updateError) console.error('Gagal update status header:', updateError)

    return NextResponse.json(insertedData, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}