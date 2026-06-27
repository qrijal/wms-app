import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouse_id')

    let query = supabase
      .from('dim_location')
      .select('*, dim_warehouses(name)')
      .order('name')

    if (profile.role === 'admin') {
      // Admin hanya lihat lokasi di warehouse sendiri
      query = query.eq('warehouse_id', profile.wh_id)
    } else if (profile.role === 'superadmin') {
      // Superadmin bisa filter berdasarkan warehouse_id (opsional)
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId)
      }
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { name, barcode, warehouse_id } = await request.json()

    // Validasi input
    if (!name) {
      return NextResponse.json({ error: 'Nama lokasi harus diisi' }, { status: 400 })
    }

    let finalWarehouseId: number | null = null

    if (profile.role === 'admin') {
      // Admin hanya bisa menambah lokasi di warehouse sendiri
      finalWarehouseId = profile.wh_id
      if (!finalWarehouseId) {
        return NextResponse.json({ error: 'Admin tidak memiliki warehouse' }, { status: 400 })
      }
    } else if (profile.role === 'superadmin') {
      // Superadmin wajib menyertakan warehouse_id
      if (!warehouse_id) {
        return NextResponse.json({ error: 'warehouse_id diperlukan untuk superadmin' }, { status: 400 })
      }
      // Verifikasi bahwa warehouse_id valid (opsional)
      const { data: warehouse } = await supabase
        .from('dim_warehouses')
        .select('id')
        .eq('id', warehouse_id)
        .single()
      if (!warehouse) {
        return NextResponse.json({ error: 'Warehouse tidak valid' }, { status: 400 })
      }
      finalWarehouseId = warehouse_id
    } else {
      return NextResponse.json({ error: 'Role tidak diizinkan' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('dim_location')
      .insert({
        warehouse_id: finalWarehouseId,
        name,
        barcode: barcode || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}