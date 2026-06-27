// src/app/api/inbound/upload-csv/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin()
    const supabase = await createClient()
    const formData = await request.formData()

    const file = formData.get('file') as File
    const notes = (formData.get('notes') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'File CSV diperlukan' }, { status: 400 })
    }

    // Data warehouse admin
    const { data: warehouse } = await supabase
      .from('dim_warehouses')
      .select('id, name, branch_id, dim_branch(name, company_id, dim_company(name))')
      .eq('id', profile.wh_id)
      .single()

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse tidak ditemukan' }, { status: 400 })
    }

    const adminBranchId = warehouse.branch_id
    const adminWhName = warehouse.name
    const adminBranchName = warehouse.dim_branch?.name || ''
    const adminCompanyName = warehouse.dim_branch?.dim_company?.name || ''

    // Baca CSV
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() !== '')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'File CSV minimal memiliki header dan satu baris data' }, { status: 400 })
    }

    const headerLine = lines[0].split(',').map(s => s.trim())
    const suratJalanIdx = headerLine.indexOf('surat_jalan')
    const companyIdx = headerLine.indexOf('company_name')
    const branchIdx = headerLine.indexOf('branch_name')
    const whIdx = headerLine.indexOf('wh_name')
    const codeIdx = headerLine.indexOf('product_code')
    const qtyIdx = headerLine.indexOf('qty')

    if (codeIdx === -1 || qtyIdx === -1) {
      return NextResponse.json({ error: 'Header CSV harus memiliki product_code dan qty' }, { status: 400 })
    }

    // Ambil surat_jalan dari baris pertama data
    let suratJalan = ''
    const firstDataCols = lines[1].split(',').map(s => s.trim())
    if (suratJalanIdx !== -1) {
      suratJalan = firstDataCols[suratJalanIdx] || ''
    }

    if (!suratJalan) {
      return NextResponse.json({ error: 'Kolom surat_jalan wajib diisi di CSV' }, { status: 400 })
    }

    // Cek duplikat surat jalan
    const { data: existingHeader } = await supabase
      .from('inbound_header')
      .select('id')
      .eq('ref_no', suratJalan)
      .maybeSingle()

    if (existingHeader) {
      return NextResponse.json({ error: `Nomor surat jalan "${suratJalan}" sudah diupload sebelumnya` }, { status: 400 })
    }

    const items: Array<{
      product_id: number
      product_code: string
      qty: number
    }> = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim())
      const whName = whIdx !== -1 ? cols[whIdx] : ''
      const companyName = companyIdx !== -1 ? cols[companyIdx] : ''
      const branchName = branchIdx !== -1 ? cols[branchIdx] : ''
      const productCode = cols[codeIdx]
      const qtyStr = cols[qtyIdx]

      if (!productCode || !qtyStr) {
        errors.push(`Baris ${i + 1}: data tidak lengkap`)
        continue
      }
      const qty = Number(qtyStr)
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Baris ${i + 1}: qty tidak valid`)
        continue
      }

      // Validasi wajib: wh_name harus sama dengan gudang user
      if (whName !== adminWhName) {
        errors.push(`Baris ${i + 1}: wh_name "${whName}" tidak sesuai dengan gudang Anda (${adminWhName})`)
        continue
      }

      // Validasi opsional: company_name & branch_name jika diisi harus cocok
      if (companyName && companyName !== adminCompanyName) {
        errors.push(`Baris ${i + 1}: company_name tidak sesuai`)
        continue
      }
      if (branchName && branchName !== adminBranchName) {
        errors.push(`Baris ${i + 1}: branch_name tidak sesuai`)
        continue
      }

      // Cari produk berdasarkan product_code & branch_id
      const { data: product } = await supabase
        .from('dim_products')
        .select('id, product_code')
        .eq('product_code', productCode)
        .eq('branch_id', adminBranchId)
        .maybeSingle()

      if (!product) {
        errors.push(`Baris ${i + 1}: produk dengan kode ${productCode} tidak ditemukan di branch Anda`)
        continue
      }

      // Gabungkan qty jika product_code sama
      const existing = items.find(item => item.product_code === productCode)
      if (existing) {
        existing.qty += qty
      } else {
        items.push({
          product_id: product.id,
          product_code: product.product_code,
          qty,
        })
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada item valid. ' + errors.join('; ') }, { status: 400 })
    }

    // Buat inbound header
    const { data: header, error: headerErr } = await supabase
      .from('inbound_header')
      .insert({
        warehouse_id: profile.wh_id,
        ref_no: suratJalan,
        notes,
        inbound_date: new Date().toISOString().split('T')[0],
        user_id: profile.user.id,
        status: 'DRAFT',
      })
      .select('id')
      .single()

    if (headerErr) {
      if (headerErr.code === '23505') {
        return NextResponse.json({ error: `Nomor surat jalan "${suratJalan}" sudah diupload. Gunakan nomor yang berbeda.` }, { status: 400 })
      }
      throw headerErr
    }

    // Insert detail (tanpa qty_received, qty_putaway)
    const detailData = items.map(item => ({
      header_id: header.id,
      product_id: item.product_id,
      product_code: item.product_code,
      qty: item.qty,
    }))

    const { error: detailErr } = await supabase
      .from('inbound_detail')
      .insert(detailData)

    if (detailErr) throw detailErr

    return NextResponse.json({
      success: true,
      header_id: header.id,
      item_count: items.length,
      warnings: errors.length > 0 ? errors : undefined,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Upload CSV error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}