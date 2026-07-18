'use client'
import React, { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'
import { CheckCircle2, AlertTriangle, Trash2, ListChecks, MapPin, ScanLine } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReceivingDetail {
  id: number
  pallet_id: string // ID Asli dari database (Hasil scan barcode)
  qty_received: number
  is_damage: boolean
}

interface PutawayDetail {
  id: number
  receiving_detail_id: number
  location_id: number
  qty: number
  dim_location?: { name: string; barcode: string }
}

interface DetailItem {
  id: number
  product_id: number
  product_code: string
  qty: number
  qty_received: number
  qty_putaway: number
  receiving_details?: ReceivingDetail[]
  putaway_details?: PutawayDetail[]
  dim_products?: { name: string; uom?: { name: string; conversion_factor: number } | null }
}

interface PutawayItem {
  receivingDetailId: number
  pallet_id: string
  product_code: string
  product_name: string
  location_id: number
  location_name: string
  location_barcode: string
  qty: number
  is_damage: boolean
}

interface LocationOption {
  id: number
  name: string
  barcode?: string
}

interface PutawayTabProps {
  details: DetailItem[]
  warehouseId?: number
  headerId: number
  headerStatus: string
  onRefresh: () => Promise<void>
}

export default function PutawayTab({
  details: initialDetails,
  warehouseId,
  headerId,
  headerStatus,
  onRefresh,
}: PutawayTabProps) {
  const [details, setDetails] = useState<DetailItem[]>(initialDetails)
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [putawayCache, setPutawayCache] = useState<PutawayItem[]>([])

  // ── State Scanner ────────────────────────────────────────────────────────
  const [scanInput, setScanInput] = useState('')
  const scanInputRef = useRef<HTMLInputElement>(null)

  // State Modal Input Lokasi
  const [modalData, setModalData] = useState<{
    detail: DetailItem
    receivingId: number
    pallet_id: string
    remaining: number
    is_damage: boolean
  } | null>(null)
  const [selectedLocId, setSelectedLocId] = useState<string>('')
  const [qty, setQty] = useState<number>(1)

  // State Notifikasi & Review
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { setDetails(initialDetails) }, [initialDetails])

  // Fetch Locations untuk Dropdown Rak
  useEffect(() => {
    if (warehouseId) {
      fetch(`/api/locations?warehouse_id=${warehouseId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setLocations(data))
        .catch(() => setLocations([]))
    }
  }, [warehouseId])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getRemainingForReceiving = (detail: DetailItem, receivingId: number) => {
    const receiving = detail.receiving_details?.find(r => r.id === receivingId)
    if (!receiving) return 0
    // Total putaway dari server
    const serverPutaway = (detail.putaway_details || [])
      .filter(p => p.receiving_detail_id === receivingId)
      .reduce((sum, p) => sum + (p.qty || 0), 0)
    // Total dari antrean lokal
    const cachePutaway = putawayCache
      .filter(p => p.receivingDetailId === receivingId)
      .reduce((sum, p) => sum + p.qty, 0)

    return receiving.qty_received - serverPutaway - cachePutaway
  }

  // Flatten data agar mempermudah render & pencarian Scanner
  const rows = details.flatMap(detail =>
    (detail.receiving_details || []).map(recv => ({
      detail,
      recv,
      remaining: getRemainingForReceiving(detail, recv.id)
    }))
  )

  const allPutawayDone = rows.length > 0 && rows.every(r => r.remaining === 0) && putawayCache.length === 0

  // ── Actions: Barcode Scanner ─────────────────────────────────────────────
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const scannedVal = scanInput.trim().toUpperCase()
    if (!scannedVal) return

    // 1. Cari pallet di dokumen ini (Cocokkan dengan Pallet ID asli dari Backend)
    const foundRow = rows.find(r => r.recv.pallet_id?.toUpperCase() === scannedVal)

    if (!foundRow) {
      setError(`❌ Pallet ID [${scannedVal}] tidak ditemukan di dokumen ini! Pastikan Anda men-scan Pallet yang benar.`)
    } else if (foundRow.remaining <= 0) {
      setError(`⚠️ Pallet ID [${scannedVal}] sudah dialokasikan sepenuhnya!`)
    } else {
      // 2. Jika ketemu, langsung buka modal untuk alokasi lokasi
      handleOpenModal(foundRow.detail, foundRow.recv, foundRow.remaining)
    }

    setScanInput('') // Kosongkan input setelah di-scan agar siap untuk scan berikutnya
  }

  // ── Actions: Modal & Queue ───────────────────────────────────────────────
  const handleOpenModal = (detail: DetailItem, recv: ReceivingDetail, remaining: number) => {
    setError('')
    setSuccess('')
    setModalData({
      detail,
      receivingId: recv.id,
      pallet_id: recv.pallet_id,
      remaining,
      is_damage: recv.is_damage,
    })
    setSelectedLocId('')
    setQty(remaining > 0 ? remaining : 1) // Default isi penuh sisa qty pallet
  }

  const handleAddToCache = () => {
    if (!modalData) return
    if (!selectedLocId) { setError('Silakan pilih lokasi terlebih dahulu'); return }
    if (qty <= 0) { setError('Qty harus lebih besar dari 0'); return }
    if (qty > modalData.remaining) { setError(`Maksimal alokasi adalah ${modalData.remaining}`); return }

    const loc = locations.find(l => l.id.toString() === selectedLocId)
    if (!loc) { setError('Lokasi tidak valid'); return }

    setPutawayCache(prev => [
      ...prev,
      {
        receivingDetailId: modalData.receivingId,
        pallet_id: modalData.pallet_id,
        product_code: modalData.detail.product_code,
        product_name: modalData.detail.dim_products?.name || modalData.detail.product_code,
        location_id: loc.id,
        location_name: loc.name,
        location_barcode: loc.barcode || '',
        qty,
        is_damage: modalData.is_damage
      },
    ])

    setSuccess(`✅ Pallet [${modalData.pallet_id}] berhasil masuk antrean lokasi ${loc.name}.`)
    setModalData(null)

    // Auto-focus kembali ke scanner setelah modal ditutup
    setTimeout(() => scanInputRef.current?.focus(), 100)
  }

  // ── Actions: BULK API (Putaway) ────────────────────────────────────────────
  const handleFinalConfirm = async () => {
    setConfirming(true)
    setError('')
    try {
      // Siapkan Payload Array untuk API Bulk Insert Putaway
      const payload = putawayCache.map(item => ({
        receiving_detail_id: item.receivingDetailId,
        location_id: item.location_id,
        qty: item.qty
      }))

      // Tembak API Putaway dengan Bulk Payload
      const res = await fetch('/api/inbound/putaway-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: payload,
          headerId: headerId // Mengubah status header ke PUTAWAY
        }),
      })

      if (!res.ok) {
        let msg = 'Gagal menyimpan putaway'
        try { const d = await res.json(); msg = d.error || msg } catch { }
        throw new Error(msg)
      }

      setPutawayCache([])
      setShowReview(false)
      setSuccess('Semua penempatan lokasi berhasil disimpan ke sistem!')
      await onRefresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  // ── Renders ──────────────────────────────────────────────────────────────
  if (headerStatus === 'CANCELED') {
    return (
      <div className="space-y-6 print:m-0 print:p-0">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold text-center flex items-center justify-center gap-2">
          <AlertTriangle size={20} /> Dokumen telah dibatalkan. Laporan penerimaan tidak berlaku.
        </div>
      </div>
    )
  }
  if (headerStatus === 'GRN' || headerStatus === 'COMPLETED') {
    return <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center flex items-center justify-center gap-2"><CheckCircle2 size={20} /> Putaway telah selesai dan dokumen sudah berstatus GRN.</div>
  }
  if (headerStatus !== 'RECEIVING' && headerStatus !== 'PUTAWAY') {
    return <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 font-semibold text-center flex items-center justify-center gap-2"><AlertTriangle size={20} /> Proses Receiving belum selesai. Tidak dapat memproses Putaway.</div>
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {allPutawayDone && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center flex items-center justify-center gap-2">
          <CheckCircle2 size={20} /> Semua item yang diterima telah dialokasikan ke lokasi masing-masing. Lanjut ke proses GRN.
        </div>
      )}

      {/* ── AREA SCANNER BARCODE (Disembunyikan jika Putaway Selesai) ── */}
      {!allPutawayDone && (
        <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-blue-800 font-bold text-lg flex items-center gap-2"><ScanLine size={20} /> Mode Scan Barcode</h3>
            <p className="text-sm text-blue-600">Arahkan kursor ke kotak di samping lalu tembak QR Code Pallet.</p>
          </div>
          <form onSubmit={handleScanSubmit} className="w-full sm:w-1/2 flex items-center gap-2 relative">
            <input
              ref={scanInputRef}
              type="text"
              placeholder="Scan Pallet ID di sini..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="w-full pl-4 pr-10 py-3 border-2 border-blue-300 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-700 font-mono font-bold tracking-wider text-lg uppercase transition-all"
              autoFocus
            />
            <Button type="submit" className="shrink-0 bg-blue-700 hover:bg-blue-800 absolute right-1 top-1 bottom-1 px-4 text-sm rounded-lg">Cari</Button>
          </form>
        </div>
      )}

      {/* Tabel Utama Daftar Putaway */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">Daftar Pallet Belum Masuk Rak</h3>
            <p className="text-xs text-slate-500 mt-1">Gunakan scanner atau klik tombol "Atur Lokasi" secara manual.</p>
          </div>
          {putawayCache.length > 0 && (
            <Button onClick={() => setShowReview(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 shadow-sm">
              <ListChecks size={18} /> Review Antrean Rak ({putawayCache.length})
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Pallet ID</th>
                <th className="px-6 py-4">SKU / Produk</th>
                <th className="px-6 py-4 text-center">Status Kondisi</th>
                <th className="px-6 py-4 text-center">Total Item</th>
                <th className="px-6 py-4 text-center">Sisa Belum Dialokasi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Belum ada barang yang diterima. Selesaikan proses Receiving terlebih dahulu.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const isFull = row.remaining === 0
                  const uomName = row.detail.dim_products?.uom?.name || 'unit'

                  return (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isFull ? 'bg-slate-50/50 opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {row.recv.pallet_id || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800 truncate max-w-[200px]" title={row.detail.dim_products?.name || '-'}>{row.detail.dim_products?.name || '-'}</p>
                        <p className="font-mono text-xs text-slate-500 mt-0.5">{row.detail.product_code}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.recv.is_damage ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-100"><AlertTriangle size={12} /> RUSAK</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle2 size={12} /> BAGUS</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">
                        {row.recv.qty_received} <span className="text-xs text-slate-400">{uomName}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isFull ? (
                          <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1"><CheckCircle2 size={14} /> RAK TEPAT</span>
                        ) : (
                          <span className="font-bold text-blue-600 text-lg">{row.remaining} <span className="text-xs text-blue-400 font-normal">{uomName}</span></span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(row.detail, row.recv, row.remaining)}
                          disabled={isFull}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <MapPin size={14} /> Atur Lokasi
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input untuk Penempatan Lokasi */}
      {modalData && (
        <Modal onClose={() => setModalData(null)} title="Scan / Pilih Lokasi Rak">
          <div className="space-y-5">
            {/* Header Informasi */}
            <div className={`p-4 rounded-xl border ${modalData.is_damage ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between mb-3 border-b pb-3 border-black/10">
                <span className="font-bold text-lg font-mono text-slate-800">{modalData.pallet_id}</span>
                {modalData.is_damage && <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1"><AlertTriangle size={12} /> HARUS KE AREA RETUR</span>}
              </div>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">Produk</span>
                  <span className="font-semibold text-slate-800">{modalData.detail.dim_products?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-xs">Total Akan Disimpan</span>
                  <span className={`font-black text-xl ${modalData.is_damage ? 'text-red-700' : 'text-blue-700'}`}>{modalData.remaining} <span className="text-sm font-semibold">{modalData.detail.dim_products?.uom?.name}</span></span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-2">Pilih / Scan Lokasi Rak <MapPin size={16} className="text-slate-400" /></label>
              <select
                value={selectedLocId}
                onChange={(e) => setSelectedLocId(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              >
                <option value="" disabled>-- Pilih Rak / Bin / Area Tujuan --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} {loc.barcode ? `[BARCODE: ${loc.barcode}]` : ''}</option>
                ))}
              </select>
            </div>

            {/* Qty dikunci agar 1 pallet = 1 pemindahan utuh */}
            <div className="hidden">
              <Input label="Kuantitas (Qty)" type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min={1} max={modalData.remaining} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setModalData(null)}>Batal</Button>
              <Button onClick={handleAddToCache} disabled={!selectedLocId} className="bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2 px-6 py-2.5">
                <CheckCircle2 size={18} /> Konfirmasi Lokasi
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Review Akhir (VIEW-ONLY Table) */}
      {showReview && (
        <Modal onClose={() => setShowReview(false)} title="Review Antrean Putaway" className="w-[90vw] max-w-5xl">
          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase w-32">Pallet ID</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase">Produk</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase text-center w-32">Rak Tujuan</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase text-center w-28">Total Qty</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {putawayCache.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">Antrean kosong</td></tr>
                ) : (
                  putawayCache.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 ${item.is_damage ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-mono font-bold text-slate-700">
                        {item.pallet_id}
                        {item.is_damage && <span className="block mt-1 text-[10px] text-red-600 font-bold tracking-wider">⚠ RUSAK</span>}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{item.product_name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{item.product_code}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-sm">
                          {item.location_name}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-700 text-lg">
                        {item.qty}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => setPutawayCache(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors">
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
              disabled={confirming || putawayCache.length === 0}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5"
            >
              {confirming ? 'Menyimpan ke Database...' : 'Konfirmasi & Simpan API'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}