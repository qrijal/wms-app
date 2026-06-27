import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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