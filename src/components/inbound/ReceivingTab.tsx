'use client'
import React, { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'
import {
  CheckCircle2, AlertTriangle, Trash2, ListChecks,
  PackagePlus, Printer, Plus, Settings
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReceivingDetail {
  id: number
  qty_received: number
  is_damage: boolean
}

interface DetailItem {
  id: number
  product_id: number
  product_code: string
  qty: number
  qty_received: number
  receiving_details?: ReceivingDetail[]
  dim_products?: { name: string; uom?: { name: string; conversion_factor: number } | null }
}

interface PalletRow {
  id: string
  qty: number | ''
  is_damage: boolean
}

interface ScannedItem {
  detailId: number
  is_damage: boolean
  product_code: string
  product_name: string
  qty: number
  uomName: string
  pallet_id: string // Temporary ID (misal: "Pallet #1") saat di antrean, menjadi Real ID saat diprint
  temp_id?: string  // Menyimpan memori referensi "Pallet #1" untuk dicetak di stiker
}

interface ReceivingTabProps {
  details: DetailItem[]
  warehouseId: number
  headerId: number
  headerStatus: string
  onRefresh: () => Promise<void>
}

export default function ReceivingTab({
  details: initialDetails,
  headerId,
  headerStatus,
  onRefresh,
}: ReceivingTabProps) {
  const [details, setDetails] = useState<DetailItem[]>(initialDetails)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [printPallets, setPrintPallets] = useState<ScannedItem[]>([]) // Menyimpan data valid dari DB untuk di-print

  // ── State Modal Input Pallet ───────────────────────────────────────────────
  const [currentProduct, setCurrentProduct] = useState<DetailItem | null>(null)
  const [palletRows, setPalletRows] = useState<PalletRow[]>([])

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── State Modal Review Akhir & Print ─────────────────────────────────────
  const [showReview, setShowReview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  // Pilihan Ukuran Kertas Default
  const [paperSize, setPaperSize] = useState('100mm 150mm')

  useEffect(() => { setDetails(initialDetails) }, [initialDetails])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getReceivedWithCache = (detail: DetailItem) =>
    (detail.qty_received || 0) +
    (scannedItems
      .filter(s => s.detailId === detail.id)
      .reduce((sum, s) => sum + s.qty, 0))

  const getRemaining = (detail: DetailItem) =>
    detail.qty - getReceivedWithCache(detail)

  const getUomName = (detail: DetailItem) =>
    detail.dim_products?.uom?.name || 'unit'

  const pendingItems = details.filter(d => getRemaining(d) > 0)
  const allDone = pendingItems.length === 0 && scannedItems.length === 0

  // Helper pencari angka ID tertinggi di antrean dan modal saat ini (Format Urutan Fisik)
  const getNextPalletId = (currentRows: PalletRow[], queue: ScannedItem[]) => {
    let maxId = 0
    queue.forEach(item => {
      const num = parseInt(item.pallet_id.replace('Pallet #', ''), 10)
      if (!isNaN(num)) maxId = Math.max(maxId, num)
    })
    currentRows.forEach(row => {
      const num = parseInt(row.id.replace('Pallet #', ''), 10)
      if (!isNaN(num)) maxId = Math.max(maxId, num)
    })
    return `Pallet #${maxId + 1}`
  }

  // ── Actions: Modal Input Pallet ──────────────────────────────────────────
  const openPalletModal = (detail: DetailItem) => {
    setError('')
    setSuccess('')
    setCurrentProduct(detail)
    const firstId = getNextPalletId([], scannedItems)
    setPalletRows([{ id: firstId, qty: '', is_damage: false }])
  }

  const handlePalletChange = (index: number, field: keyof PalletRow, value: any) => {
    setPalletRows(prev => {
      const newRows = [...prev]
      newRows[index] = { ...newRows[index], [field]: value }
      return newRows
    })
  }

  const handleAddPalletRow = () => {
    setPalletRows(prev => {
      const nextId = getNextPalletId(prev, scannedItems)
      return [...prev, { id: nextId, qty: '', is_damage: false }]
    })
  }

  const removePalletRow = (index: number) => {
    setPalletRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveToQueue = () => {
    if (!currentProduct) return

    const validPallets = palletRows.filter(p => Number(p.qty) > 0)

    if (validPallets.length === 0) {
      setError('Harap isi kuantitas minimal pada 1 pallet.')
      return
    }

    const totalInput = validPallets.reduce((sum, p) => sum + Number(p.qty), 0)
    const remaining = getRemaining(currentProduct)

    if (totalInput > remaining) {
      setError(`Kuantitas melebihi batas! Sisa yang bisa diterima: ${remaining} ${getUomName(currentProduct)}`)
      return
    }

    const newScanned = validPallets.map(p => ({
      detailId: currentProduct.id,
      is_damage: p.is_damage,
      product_code: currentProduct.product_code,
      product_name: currentProduct.dim_products?.name || currentProduct.product_code,
      qty: Number(p.qty),
      uomName: getUomName(currentProduct),
      pallet_id: p.id
    }))

    setScannedItems(prev => [...prev, ...newScanned])
    setSuccess(`Berhasil menambahkan ${validPallets.length} pallet ke antrean.`)
    setCurrentProduct(null)
  }

  // ── Actions: BULK API (Supabase) ─────────────────────────────────────────
  const handleFinalConfirm = async () => {
    setConfirming(true)
    setError('')
    try {
      // 1. Siapkan Payload Array (Bulk Insert) tanpa pallet_id
      const payload = scannedItems.map(item => ({
        detail_id: item.detailId,
        qty_received: item.qty,
        is_damage: item.is_damage,
      }))

      // Tembak API
      const res = await fetch(`/api/inbound/receiving-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: payload,
          headerId: headerId // Mengubah status header ke RECEIVING
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Gagal mencatat penerimaan ke database.')
      }

      // 2. Tangkap Response dari Supabase yang mengembalikan Real Pallet ID
      const savedDataFromDb = await res.json()

      // 3. Gabungkan ID fisik asli dari DB dengan referensi cetak (temp_id)
      const readyToPrint = scannedItems.map((item, idx) => ({
        ...item,
        // Mengganti "Pallet #X" dengan Real ID dari Supabase (Misal: PLT-2607-001)
        pallet_id: savedDataFromDb[idx]?.pallet_id || item.pallet_id,
        // temp_id menyimpan referensi nomor urut "Pallet #X" untuk dicetak di stiker
        temp_id: item.pallet_id 
      }))

      // 4. Update State
      setPrintPallets(readyToPrint) // Kirim data sukses ke antrean Print
      setScannedItems([])           // Kosongkan layar antrean UI
      setShowReview(false)
      setSuccess('Penerimaan berhasil! Silakan cetak Label Pallet.')
      await onRefresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConfirming(false) // Tombol akan terbuka kuncinya
    }
  }

  // ── Actions: Fitur Cetak ─────────────────────────────────────────────────
  const executePrint = () => {
    setShowPrintModal(false)
    setTimeout(() => {
      window.print()
    }, 300)
  }

  // ── Render Dinamis Layout Print Berdasarkan Ukuran ────────────────────────
  const renderPrintLayout = (pallet: ScannedItem) => {
    // 1. UKURAN SANGAT KECIL (50mm x 10mm) - Mirip label perhiasan/kabel
    if (paperSize === '50mm 10mm') {
      return (
        <div className="flex items-center justify-start w-screen h-screen page-break border-0 rounded-none bg-white overflow-hidden p-0.5 gap-1">
          <div className="shrink-0 pl-1">
            <QRCodeSVG value={pallet.pallet_id} size={30} level="M" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden w-full pr-1">
            <div className="flex justify-between items-center w-full">
              <h1 className="text-[10px] font-black font-mono leading-none m-0 p-0 text-black">{pallet.pallet_id}</h1>
              <span className="text-[8px] font-black leading-none m-0 p-0 text-black">{pallet.qty} {pallet.uomName}</span>
            </div>
            <div className="flex justify-between items-center w-full mt-[2px]">
              <p className="text-[7.5px] font-bold leading-tight truncate text-black">SKU: {pallet.product_code}</p>
              {/* Tambahan Nomor Urut Referensi Fisik */}
              <p className="text-[7px] font-bold text-slate-500">({pallet.temp_id})</p>
            </div>
            {pallet.is_damage && (
              <p className="text-[7px] font-black leading-none mt-[2px] border border-black inline-block px-1 bg-black text-white w-max">⚠ RUSAK</p>
            )}
          </div>
        </div>
      )
    }

    // 2. UKURAN KECIL (50mm x 20mm) - Standar Thermal Label Kecil
    if (paperSize === '50mm 20mm') {
      return (
        <div className="flex items-center justify-start w-screen h-screen page-break border-0 rounded-none bg-white overflow-hidden p-1 gap-2">
          <div className="shrink-0 pl-1">
            <QRCodeSVG value={pallet.pallet_id} size={55} level="M" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden w-full pr-1">
            <h1 className="text-xs font-black font-mono leading-none m-0 p-0 text-black">{pallet.pallet_id}</h1>
            <p className="text-[9px] font-bold leading-tight truncate mt-1 text-black">{pallet.product_name}</p>
            <div className="flex justify-between items-center w-full mt-1">
              <p className="text-[9px] font-mono font-bold leading-none text-black">SKU: {pallet.product_code}</p>
              {/* Tambahan Nomor Urut Referensi Fisik */}
              <p className="text-[8px] font-bold text-slate-500">Ref: {pallet.temp_id}</p>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-black leading-none text-black">QTY: {pallet.qty} {pallet.uomName}</span>
              {pallet.is_damage && <span className="text-[8px] font-black leading-none text-white bg-black px-1 rounded">⚠ DMG</span>}
            </div>
          </div>
        </div>
      )
    }

    // 3. UKURAN BESAR (100mm x 150mm & A6) - Standar Label Pengiriman
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center w-screen h-screen page-break border-0 rounded-none bg-white">
        <QRCodeSVG value={pallet.pallet_id} size={150} level="M" />
        
        <h1 className="text-3xl font-black tracking-widest font-mono mt-4 uppercase text-black">
          {pallet.pallet_id}
        </h1>
        
        <div className="w-full border-t-2 border-dashed border-black my-4"></div>
        
        <p className="text-xl font-bold text-black max-w-[95%] mx-auto leading-tight">
          {pallet.product_name}
        </p>
        
        <div className="mt-5 flex gap-4 text-lg font-mono font-bold bg-black text-white px-6 py-2 rounded-lg">
          <span>SKU: {pallet.product_code}</span>
          <span>QTY: {pallet.qty} {pallet.uomName}</span>
        </div>

        {/* Tambahan Nomor Urut Referensi Fisik di Ukuran Besar */}
        <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">
          Referensi Fisik: {pallet.temp_id}
        </p>

        {pallet.is_damage && (
          <div className="mt-5 text-2xl font-black border-4 border-black text-black px-6 py-2 uppercase tracking-wider">
            ⚠ BARANG RUSAK ⚠
          </div>
        )}
      </div>
    )
  }

  // ── Renders ──────────────────────────────────────────────────────────────
  if (headerStatus === 'CANCELED') {
    return(
      <div className="space-y-6 print:m-0 print:p-0">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold text-center flex items-center justify-center gap-2">
          <AlertTriangle size={20} /> Dokumen telah dibatalkan. Laporan penerimaan tidak berlaku.
        </div>
      </div>
    )
  }

  if (headerStatus === 'GRN' || headerStatus === 'COMPLETED') {
    return (
      <div className="space-y-6 print:m-0 print:p-0">
        <div className="print:hidden p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center flex items-center justify-center gap-2">
          <CheckCircle2 size={20} /> Dokumen telah berstatus GRN. Laporan penerimaan terkunci.
        </div>

        {/* Summary Table for GRN */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center print:hidden">
            <h3 className="font-semibold text-lg text-slate-800">Rekapitulasi Penerimaan (Final)</h3>
            <Button onClick={() => window.print()} variant="secondary" className="flex items-center gap-2">
              <Printer size={16} /> Print Laporan
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4 text-center">SKU</th>
                  <th className="px-6 py-4 text-center">Unit</th>
                  <th className="px-6 py-4 text-right">Dipesan</th>
                  <th className="px-6 py-4 text-right">Diterima</th>
                  <th className="px-6 py-4 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {details.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 font-medium text-slate-800">{item.dim_products?.name}</td>
                    <td className="px-6 py-4 text-center font-mono text-slate-500">{item.product_code}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{item.dim_products?.uom?.name || 'unit'}</td>
                    <td className="px-6 py-4 text-right font-medium">{item.qty}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">{item.qty_received || 0}</td>
                    <td className="px-6 py-4 text-right">
                      {(item.qty - (item.qty_received || 0)) === 0 ? (
                        <span className="text-green-600 font-medium">0</span>
                      ) : (
                        <span className="text-red-600 font-bold">{item.qty - (item.qty_received || 0)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const totalInputQty = palletRows.reduce((sum, p) => sum + Number(p.qty || 0), 0)
  const currentRemaining = currentProduct ? getRemaining(currentProduct) : 0
  const isOverQty = totalInputQty > currentRemaining

  return (
    <div className="space-y-6 print:m-0 print:p-0">

      {/* ── AREA APLIKASI UTAMA (HIDDEN SAAT PRINT) ── */}
      <div className="print:hidden space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {/* Notifikasi Print Tersedia */}
        {printPallets.length > 0 && (
          <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col">
              <span className="text-blue-800 font-bold text-lg">Label Pallet Siap Dicetak!</span>
              <span className="text-blue-600 text-sm">{printPallets.length} Pallet berhasil disimpan ke Database.</span>
            </div>
            <Button onClick={() => setShowPrintModal(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 shrink-0">
              <Printer size={18} /> Pengaturan Cetak Label
            </Button>
          </div>
        )}

        {allDone && (
          <div className="p-5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700 font-semibold">
            <CheckCircle2 size={24} />
            Semua item pesanan sudah terpenuhi!
          </div>
        )}

        {/* Tabel Utama Daftar Item */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 text-lg">Daftar Item ({details.length})</h3>
            {scannedItems.length > 0 && (
              <Button onClick={() => setShowReview(true)} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 shadow-sm">
                <ListChecks size={18} /> Review Antrean ({scannedItems.length})
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">SKU / Nama Produk</th>
                  <th className="px-6 py-4 text-center">Dipesan</th>
                  <th className="px-6 py-4 text-center">Telah Diterima</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {details.map((detail) => {
                  const received = getReceivedWithCache(detail)
                  const remaining = getRemaining(detail)
                  const isFull = remaining === 0
                  const uomName = getUomName(detail)

                  return (
                    <tr key={detail.id} className={`hover:bg-slate-50 transition-colors ${isFull ? 'bg-slate-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{detail.dim_products?.name || '-'}</p>
                        <p className="font-mono text-xs text-slate-500 mt-0.5">{detail.product_code}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">
                        {detail.qty} <span className="text-xs text-slate-400">{uomName}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${received > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{received}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isFull ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                            <CheckCircle2 size={12} /> Penuh
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs font-medium">Sisa: {remaining}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openPalletModal(detail)}
                          disabled={isFull}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <PackagePlus size={14} /> Input Pallet
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Input Pallet Dinamis (Satu Tabel Lebar 90vw) */}
        {currentProduct && (
          <Modal onClose={() => setCurrentProduct(null)} title="Input Fisik Pallet" className="w-[90vw] max-w-6xl">
            <div className="space-y-6 flex flex-col h-full">
              {/* Header Info */}
              <div className="flex items-center justify-between bg-slate-50 p-5 rounded-xl border border-slate-200 shrink-0">
                <div>
                  <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Row Induk (Produk)</p>
                  <p className="font-bold text-slate-800 text-lg">{currentProduct.dim_products?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Sisa Kuota</p>
                  <p className={`font-black text-2xl ${isOverQty ? 'text-red-600' : 'text-blue-700'}`}>
                    {currentRemaining} <span className="text-lg font-semibold text-slate-500">{getUomName(currentProduct)}</span>
                  </p>
                </div>
              </div>

              {/* Tabel Anak (Children Rows) */}
              <div className="border border-slate-200 rounded-xl bg-white shadow-sm flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="overflow-y-auto p-0 flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="p-4 w-32">Referensi</th>
                        <th className="p-4 w-40">Product Code</th>
                        <th className="p-4">Product Name</th>
                        <th className="p-4 w-32">Qty</th>
                        <th className="p-4 w-32 text-center">Damage</th>
                        <th className="p-4 w-16 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {palletRows.map((row, idx) => (
                        <tr key={idx} className={row.is_damage ? 'bg-red-50/30' : 'hover:bg-slate-50'}>
                          <td className="p-4">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {row.id}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-500">{currentProduct.product_code}</td>
                          <td className="p-4 font-medium text-slate-800 truncate max-w-[200px]" title={currentProduct.dim_products?.name}>
                            {currentProduct.dim_products?.name}
                          </td>
                          <td className="p-4">
                            <input
                              type="number"
                              placeholder="Qty"
                              value={row.qty}
                              onChange={(e) => handlePalletChange(idx, 'qty', e.target.value)}
                              className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              min={1}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.is_damage}
                                onChange={(e) => handlePalletChange(idx, 'is_damage', e.target.checked)}
                                className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                              />
                            </label>
                          </td>
                          <td className="p-4 text-center">
                            {palletRows.length > 1 && (
                              <button
                                onClick={() => removePalletRow(idx)}
                                className="p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Baris Tombol Tambah Manual */}
                      <tr>
                        <td colSpan={6} className="p-3 bg-slate-50/50 border-t border-slate-100">
                          <Button
                            variant="secondary"
                            onClick={handleAddPalletRow}
                            className="w-full flex justify-center items-center gap-2 border-dashed border-2 border-slate-300 bg-transparent hover:bg-slate-100 text-slate-600 py-3"
                          >
                            <Plus size={18} /> Tambah Fisik Pallet Selanjutnya
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validasi Error Inline */}
              {isOverQty && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-center flex items-center justify-center gap-2 shrink-0">
                  <AlertTriangle size={20} /> Total input QTY ({totalInputQty}) melebihi sisa kuota yang diizinkan ({currentRemaining})!
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex justify-end gap-4 pt-5 border-t border-slate-200 shrink-0 mt-auto">
                <Button variant="secondary" onClick={() => setCurrentProduct(null)} className="px-6 py-2.5 text-base">Batal</Button>
                <Button
                  onClick={handleSaveToQueue}
                  disabled={isOverQty || totalInputQty === 0}
                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 px-6 py-2.5 text-base font-semibold"
                >
                  Simpan ke Antrean
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Review Akhir & Bulk Insert Trigger (Table View-Only) */}
        {showReview && (
          <Modal onClose={() => setShowReview(false)} title="Review Antrean Penerimaan" className="w-[90vw] max-w-5xl">
            <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-slate-600 uppercase">Referensi</th>
                    <th className="p-4 text-xs font-semibold text-slate-600 uppercase">Produk</th>
                    <th className="p-4 text-xs font-semibold text-slate-600 uppercase text-center">Qty</th>
                    <th className="p-4 text-xs font-semibold text-slate-600 uppercase text-center">Kondisi</th>
                    <th className="p-4 text-xs font-semibold text-slate-600 uppercase text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scannedItems.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-500">Antrean kosong</td></tr>
                  ) : (
                    scannedItems.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 ${item.is_damage ? 'bg-red-50/20' : ''}`}>
                        <td className="p-4">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                            {item.pallet_id}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">{item.product_name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{item.product_code}</p>
                        </td>
                        <td className="p-4 text-center font-black text-slate-700 text-lg">
                          {item.qty} <span className="text-xs font-normal text-slate-500">{item.uomName}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded ${item.is_damage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item.is_damage ? 'RUSAK' : 'BAGUS'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setScannedItems(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus dari antrean"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowReview(false)}>Tutup</Button>
              <Button 
                onClick={handleFinalConfirm} 
                disabled={confirming || scannedItems.length === 0}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5"
              >
                {confirming ? 'Menyimpan ke Database...' : 'Konfirmasi & Simpan API'}
              </Button>
            </div>
          </Modal>
        )}

        {/* Modal Pengaturan Kertas Cetak */}
        {showPrintModal && (
          <Modal onClose={() => setShowPrintModal(false)} title="Pengaturan Cetak Label Pallet">
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-4">
                <Settings className="text-slate-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-800">Ukuran Kertas Printer Thermal</h4>
                  <p className="text-sm text-slate-500 mb-4">Tata letak QR Code & Teks akan otomatis menyesuaikan.</p>
                  
                  <div className="flex flex-col gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="paperSize" value="A6" checked={paperSize === 'A6'} onChange={(e) => setPaperSize(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">A6 Label (105mm x 148mm)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="paperSize" value="100mm 150mm" checked={paperSize === '100mm 150mm'} onChange={(e) => setPaperSize(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Besar (100mm x 150mm) - Standar Ekspedisi</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="paperSize" value="50mm 20mm" checked={paperSize === '50mm 20mm'} onChange={(e) => setPaperSize(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Kecil (50mm x 20mm) - Barcode Produk</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="paperSize" value="50mm 10mm" checked={paperSize === '50mm 10mm'} onChange={(e) => setPaperSize(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Sangat Kecil (50mm x 10mm) - Label Tag</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setShowPrintModal(false)}>Batal</Button>
                <Button onClick={executePrint} className="bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2">
                  <Printer size={16} /> Lanjutkan Cetak
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>

      {/* ── AREA KHUSUS CETAK (HIDDEN DI LAYAR, MUNCUL DI KERTAS) ── */}
      <div id="print-area" className="hidden print:block w-full text-black bg-white">
        <style type="text/css" media="print">
          {`
            @page { size: ${paperSize}; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            .page-break { page-break-after: always; }

            /* Trik Visibility agar Sidebar / Header Layout Global Hilang */
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100vw;
              margin: 0;
              padding: 0;
            }
          `}
        </style>

        <div>
          {printPallets.map((pallet, idx) => (
            <React.Fragment key={idx}>
              {/* Memanggil fungsi render layout dinamis */}
              {renderPrintLayout(pallet)}
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  )
}