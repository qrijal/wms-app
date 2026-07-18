// src/app/api/putaway-details/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── METHOD GET (Untuk menarik histori) ────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('receiving_detail_ids')
  if (!ids) return NextResponse.json([])

  const idArray = ids.split(',').map(Number).filter(n => !isNaN(n))
  if (idArray.length === 0) return NextResponse.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbound_putaway_detail')
    .select('id, receiving_detail_id, location_id, qty, dim_location(name, barcode)')
    .in('receiving_detail_id', idArray)

  if (error) {
    console.error('Error get putaway details:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ─── METHOD POST (Untuk Bulk Insert & Update Status Header) ────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Tangkap 'items' dan 'headerId'
    const { items, headerId } = body 

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap atau kosong' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Lakukan Bulk Insert ke tabel inbound_putaway_detail
    const { data, error: insertError } = await supabase
      .from('inbound_putaway_detail')
      .insert(items)
      .select() 

    if (insertError) {
      console.error('Error bulk insert putaway details:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 2. Update status header menjadi PUTAWAY
    if (headerId) {
      const { error: updateError } = await supabase
        .from('inbound_header')
        .update({ status: 'PUTAWAY' })
        .eq('id', headerId)
        .eq('status', 'RECEIVING') // Pastikan hanya update jika status sebelumnya adalah RECEIVING

      if (updateError) {
         console.error('Gagal update status header ke PUTAWAY:', updateError)
         // Kita log error tapi tetap me-return data sukses untuk insert putaway
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('Server error in putaway POST:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}