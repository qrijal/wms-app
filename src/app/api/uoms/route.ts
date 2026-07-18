import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

// src/app/api/uoms/route.ts
export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { name, warehouse_id } = await request.json()

    let finalWarehouseId = warehouse_id || null
    if (profile.role === 'admin') finalWarehouseId = profile.wh_id

    const { data, error } = await supabase
      .from('dim_product_uom') // Sesuaikan nama tabel jika perlu
      .insert({ 
        name: name, 
        warehouse_id: finalWarehouseId,
        // created_at biasanya otomatis diisi oleh Supabase
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}