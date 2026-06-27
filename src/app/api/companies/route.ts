import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireSuperadmin()
    const supabase = await createClient()
    const { data } = await supabase.from('dim_company').select('*').order('name')
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperadmin()
    const supabase = await createClient()
    const body = await request.json()
    const { data, error } = await supabase.from('dim_company').insert({ name: body.name }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}