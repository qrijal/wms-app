// src/app/api/inventory/route.ts
import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const productCode = searchParams.get('product_code') || ''
    const locationName = searchParams.get('location') || ''
    const warehouseId = searchParams.get('warehouse_id') || ''
    const productId = searchParams.get('product_id') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('inv_warehouse_stock')
      .select(
        `id,
        warehouse_id,
        product_id,
        location_id,
        qty,
        hold_qty,
        is_damage,
        inbound_header_id,
        updated_at,
        dim_products!inner(id, name, product_code, uom_id, dim_product_uom!left(name, conversion_factor)),
        dim_location!inner(id, name, barcode),
        dim_warehouses!inner(id, name)`,
        { count: 'exact' }
      )
      .gt('qty', 0)
      .order('updated_at', { ascending: false })

    if (profile.role !== 'superadmin') {
      query = query.eq('warehouse_id', profile.wh_id)
    } else if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId)
    }

    if (productCode) query = query.ilike('dim_products.product_code', `%${productCode}%`)
    if (locationName) query = query.ilike('dim_location.name', `%${locationName}%`)
    if (productId) query = query.eq('product_id', parseInt(productId))

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Inventory query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const inventory = (data || []).map((item: any) => ({
      id: item.id,
      warehouse_id: item.warehouse_id,
      product_id: item.product_id,
      location_id: item.location_id,
      product_name: item.dim_products?.name || '-',
      product_code: item.dim_products?.product_code || '-',
      uom_name: item.dim_products?.dim_product_uom?.name || '-',
      location_name: item.dim_location?.name || '-',
      location_barcode: item.dim_location?.barcode || '-',
      warehouse_name: item.dim_warehouses?.name || '-',
      qty: item.qty,
      hold_qty: item.hold_qty ?? 0,
      damage: item.is_damage === true,
      inbound_header_id: item.inbound_header_id ?? null,
      updated_at: item.updated_at,
    }))

    return NextResponse.json({ data: inventory, count: count ?? 0 })
  } catch (error: any) {
    console.error('Inventory API error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}