import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('detail_ids')
  if (!ids) return NextResponse.json([])

  const idArray = ids.split(',').map(Number).filter(n => !isNaN(n))
  if (idArray.length === 0) return NextResponse.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbound_receiving_detail')
    .select('id, inbound_detail_id, qty_received, is_damage, created_at')
    .in('inbound_detail_id', idArray)

  if (error) {
    console.error('Error get receiving details:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}