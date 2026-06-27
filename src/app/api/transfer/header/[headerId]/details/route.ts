import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ headerId: string }> }) {
  const { headerId } = await params
  const profile = await getUserProfile()
  const supabase = await createClient()

  const { data: header } = await supabase
    .from('tf_location_header')
    .select('*')
    .eq('id', headerId)
    .single()

  if (!header || (profile.role !== 'superadmin' && header.warehouse_id !== profile.wh_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: details } = await supabase
    .from('tf_location_detail')
    .select('*, dim_products(name)')
    .eq('header_id', headerId)

  return NextResponse.json({ header, details })
}