import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    // Di dalam GET, sebelum query daftar produk:
    const code = searchParams.get('code')

    if (code) {
      // Cari satu produk berdasarkan product_code
      const { data, error } = await supabase
        .from('dim_products')
        .select('*, dim_product_brand(name), dim_product_uom(name), dim_branch(name)')
        .eq('product_code', code)
        .maybeSingle()

      if (error) throw error
      if (!data) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

      // Validasi akses operator/admin
      if (profile.role === 'admin' || profile.role === 'operator') {
        const { data: warehouse } = await supabase
          .from('dim_warehouses')
          .select('branch_id')
          .eq('id', profile.wh_id)
          .single()
        if (!warehouse || data.branch_id !== warehouse.branch_id) {
          return NextResponse.json({ error: 'Produk tidak ditemukan di branch Anda' }, { status: 404 })
        }
      }

      return NextResponse.json(data)   // ← satu objek
    } 
    let query = supabase
      .from('dim_products')
      .select('*, dim_product_brand(name), dim_product_uom(name), dim_branch(name)')
      .order('name')

    if (profile.role === 'admin') {
      // Admin hanya lihat produk di branch warehouse sendiri
      const { data: warehouse } = await supabase
        .from('dim_warehouses')
        .select('branch_id')
        .eq('id', profile.wh_id)
        .single()
      if (!warehouse) throw new Error('Warehouse tidak valid')
      query = query.eq('branch_id', warehouse.branch_id)
    } else if (profile.role === 'superadmin') {
      if (branchId) {
        query = query.eq('branch_id', branchId)
      }
      // Tanpa filter -> semua produk
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
    const body = await request.json()

    let branchId: number | null = null

    if (profile.role === 'admin') {
      const { data: warehouse } = await supabase
        .from('dim_warehouses')
        .select('branch_id')
        .eq('id', profile.wh_id)
        .single()
      if (!warehouse) throw new Error('Warehouse tidak valid')
      branchId = warehouse.branch_id
    } else if (profile.role === 'superadmin') {
      if (!body.branch_id) {
        return NextResponse.json({ error: 'branch_id diperlukan untuk superadmin' }, { status: 400 })
      }
      branchId = body.branch_id
    } else {
      return NextResponse.json({ error: 'Role tidak diizinkan' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('dim_products')
      .insert({
        name: body.name,
        product_code: body.product_code,
        brand_id: body.brand_id || null,
        uom_id: body.uom_id || null,
        branch_id: branchId,
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