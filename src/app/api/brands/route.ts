import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const filterWarehouseId = searchParams.get('warehouse_id')
    
    let query = supabase
      .from('dim_product_brand')
      .select('*, dim_warehouses(name)')
      .order('name')
    
    // Admin hanya melihat brand dari warehouse-nya atau brand global (NULL)
    if (profile.role === 'admin') {
      query = query.or(`warehouse_id.eq.${profile.wh_id},warehouse_id.is.null`)
    } else if (profile.role === 'superadmin') {
      if (filterWarehouseId) query = query.eq('warehouse_id', filterWarehouseId)
    }

    const { data, error } = await query
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    
    const body = await request.json()
    const { name, warehouse_id } = body

    let finalWarehouseId = warehouse_id || null
    
    // Jika role admin, paksa gunakan warehouse miliknya sendiri
    if (profile.role === 'admin') {
      if (!profile.wh_id) {
        return NextResponse.json({ error: 'Warehouse ID tidak ditemukan pada profil admin' }, { status: 400 })
      }
      finalWarehouseId = profile.wh_id
    }

    if (!name) {
      return NextResponse.json({ error: 'Nama brand wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dim_product_brand')
      .insert({ 
        name, 
        warehouse_id: finalWarehouseId 
      })
      .select()
      .single()

    if (error) throw error
    
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/brands error:', e)
    return NextResponse.json({ error: e.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}