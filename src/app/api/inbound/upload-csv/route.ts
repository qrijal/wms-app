//src\app\api\inbound\upload-csv\route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

// --- FUNGSI HELPER UNTUK MENGUBAH TANGGAL ---
function formatDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();
  const parts = cleaned.split(/[\/\-]/); // Memisahkan karakter "/" atau "-"
  // 1. Definisikan kolom wajib sesuai format
  const REQUIRED_COLUMNS = [
    'company_name',
    'branch_name',
    'wh_name',
    'surat_jalan',
    'inbound_date',
    'product_code',
    'qty',
    'batch_number',
    'expired_date'
  ];

  // 2. Buat fungsi validasi
  function validateUploadData(parsedData: any[]) {
    // Cek apakah file kosong
    if (!parsedData || parsedData.length === 0) {
      throw new Error("File is empty or no data found.");
    }

    // Cek setiap baris data
    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];

      // Cek setiap kolom wajib di baris tersebut
      for (const col of REQUIRED_COLUMNS) {
        // Jika kolom tidak ada, bernilai null, undefined, atau string kosong
        if (row[col] === undefined || row[col] === null || String(row[col]).trim() === '') {
          // Lemparkan error yang spesifik agar user tahu baris mana yang salah
          throw new Error(`Upload failed: Row ${i + 1} is incomplete. Column '${col}' is missing or empty.`);
        }
      }
    }

    return true; // Jika lolos semua, kembalikan true
  }
  if (parts.length === 3) {
    // Jika format sudah YYYY-MM-DD (Tahun di depan)
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    // Jika format DD/MM/YYYY (Tahun di belakang, standar CSV Excel Indonesia)
    if (parts[2].length === 4) {
      const dd = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const yyyy = parts[2];
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return cleaned; // Kembalikan default jika format aneh
}

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
      .select('id, name, branch_id')
      .eq('id', profile.wh_id)
      .single()

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse tidak ditemukan' }, { status: 400 })
    }

    const { data: branch } = await supabase
      .from('dim_branch')
      .select('name, company_id')
      .eq('id', warehouse.branch_id)
      .maybeSingle()

    const { data: company } = await supabase
      .from('dim_company')
      .select('name')
      .eq('id', branch?.company_id)
      .maybeSingle()

    const adminWhName = warehouse.name
    const adminBranchName = branch?.name || ''
    const adminCompanyName = company?.name || ''

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
    const batchIdx = headerLine.indexOf('batch_number')
    const expIdx = headerLine.indexOf('expired_date')

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
      batch_number: string
      expired_date: string | null
    }> = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim())
      const whName = whIdx !== -1 ? cols[whIdx] : ''
      const companyName = companyIdx !== -1 ? cols[companyIdx] : ''
      const branchName = branchIdx !== -1 ? cols[branchIdx] : ''
      const productCode = cols[codeIdx]
      const qtyStr = cols[qtyIdx]
      const batchNumber = batchIdx !== -1 ? cols[batchIdx] : ''
      const expiredDateStr = expIdx !== -1 ? cols[expIdx] : ''

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
      if (whName && whName !== adminWhName) {
        errors.push(`Baris ${i + 1}: wh_name "${whName}" tidak sesuai dengan gudang Anda (${adminWhName})`)
        continue
      }

      // Validasi opsional: company_name & branch_name
      if (companyName && companyName !== adminCompanyName) {
        errors.push(`Baris ${i + 1}: company_name tidak sesuai`)
        continue
      }
      if (branchName && branchName !== adminBranchName) {
        errors.push(`Baris ${i + 1}: branch_name tidak sesuai`)
        continue
      }

      // Cari produk berdasarkan product_code & warehouse_id
      const { data: product } = await supabase
        .from('dim_products')
        .select('id, product_code')
        .eq('product_code', productCode)
        .eq('warehouse_id', profile.wh_id)
        .maybeSingle()

      if (!product) {
        errors.push(`Baris ${i + 1}: produk dengan kode ${productCode} tidak ditemukan di gudang Anda`)
        continue
      }

      const safeBatchNumber = batchNumber || ''
      const safeExpiredDate = formatDateToISO(expiredDateStr)

      // Gabungkan qty jika product_code, batch_number, dan expired_date sama
      const existing = items.find(item =>
        item.product_code === productCode &&
        item.batch_number === safeBatchNumber &&
        item.expired_date === safeExpiredDate
      )

      if (existing) {
        existing.qty += qty
      } else {
        items.push({
          product_id: product.id,
          product_code: product.product_code,
          qty,
          batch_number: safeBatchNumber,
          expired_date: safeExpiredDate
        })
      }
    }

    // 1. VALIDASI KETAT
    if (errors.length > 0) {
      return NextResponse.json({
        error: 'Upload dibatalkan karena terdapat baris yang tidak valid. Harap perbaiki CSV Anda: ' + errors.join(' | ')
      }, { status: 400 })
    }

    // 2. Cegah jika file CSV kosong
    if (items.length === 0) {
      return NextResponse.json({ error: 'File CSV tidak memiliki data item.' }, { status: 400 })
    }

    // 3. Buat inbound header
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

    // 4. Insert detail
    const detailData = items.map(item => ({
      header_id: header.id,
      product_id: item.product_id,
      product_code: item.product_code,
      qty: item.qty,
      batch_number: item.batch_number || null,
      expired_date: item.expired_date
    }))

    const { error: detailErr } = await supabase
      .from('inbound_detail')
      .insert(detailData)

    // PERBAIKAN: ROLLBACK HEADER JIKA DETAIL GAGAL
    if (detailErr) {
      await supabase.from('inbound_header').delete().eq('id', header.id)
      return NextResponse.json({
        error: `Gagal menyimpan detail produk ke database. File dibatalkan. (Pesan: ${detailErr.message})`
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      header_id: header.id,
      item_count: items.length,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Upload CSV error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}