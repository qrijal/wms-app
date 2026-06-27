// src/app/api/export/route.ts
import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type') || 'inventory'
    const format = searchParams.get('format') || 'csv'
    const productCode = searchParams.get('product_code') || ''
    const location = searchParams.get('location') || ''
    const warehouseId = searchParams.get('warehouse_id') || ''

    if (type !== 'inventory') {
      return NextResponse.json({ error: 'Type not supported yet' }, { status: 400 })
    }

    let query = supabase
      .from('inv_warehouse_stock')
      .select(`
        qty,
        is_damage,
        inbound_header_id,
        updated_at,
        dim_products!inner(name, product_code),
        dim_location!inner(name),
        dim_warehouses!inner(name),
        inbound_header!left(ref_no)
      `)
      .gt('qty', 0)

    if (profile.role !== 'superadmin') {
      query = query.eq('warehouse_id', profile.wh_id)
    } else if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId)
    }

    if (productCode) {
      query = query.ilike('dim_products.product_code', `%${productCode}%`)
    }
    if (location) {
      query = query.ilike('dim_location.name', `%${location}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('Export query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (format === 'csv') {
      // Header CSV dengan urutan baru: Warehouse,Product Code,Product Name,Location,Qty,Damage,No SJ
      const header = 'Warehouse,Product Code,Product Name,Location,Qty,Damage,No SJ\n'
      const rows = (data || []).map((item: any) => {
        const warehouse = item.dim_warehouses?.name || 'Unknown'
        const productCode = item.dim_products?.product_code || '-'
        const productName = (item.dim_products?.name || 'Unknown').replace(/"/g, '""')
        const locationName = (item.dim_location?.name || 'Unknown').replace(/"/g, '""')
        const qty = item.qty
        const damage = item.is_damage ? 'Yes' : 'No'
        const noSJ = item.inbound_header?.ref_no ?? '-'  // ambil ref_no dari relasi

        return [
          `"${warehouse}"`,
          productCode,
          `"${productName}"`,
          `"${locationName}"`,
          qty,
          damage,
          noSJ,
        ].join(',')
      }).join('\n')

      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=inventory.csv',
        },
      })
    }

    // Jika bukan CSV, kembalikan JSON
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Export API error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}