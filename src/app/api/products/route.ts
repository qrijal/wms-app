import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    
    const body = await request.json()
    const { name, product_code, brand_id, uom_id, warehouse_id } = body

    let finalWarehouseId = warehouse_id

    // Admin dipaksa menggunakan warehouse_id miliknya sendiri
    if (profile.role === 'admin') {
      if (!profile.wh_id) {
        return NextResponse.json({ error: 'Warehouse ID tidak ditemukan pada profil admin' }, { status: 400 })
      }
      finalWarehouseId = profile.wh_id
    }

    // Validasi Data
    if (!name || !product_code || !uom_id || !finalWarehouseId) {
      return NextResponse.json(
        { error: 'Data tidak lengkap (Nama, Barcode, UOM, dan Warehouse wajib diisi)' }, 
        { status: 400 }
      )
    }

    // Insert ke Database
    const { data, error } = await supabase
      .from('dim_products')
      .insert({
        name,
        product_code,
        brand_id: brand_id, // null jika string kosong
        uom_id,
        warehouse_id: finalWarehouseId // Menggunakan warehouse_id
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Product Code (Barcode) tersebut sudah terdaftar' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/products error:', e)
    return NextResponse.json({ error: e.message || 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}