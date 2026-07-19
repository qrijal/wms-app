// src/components/inbound/PutawayTab.tsx
'use client'
import React, { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'
import { Edit3, CheckCircle2, AlertTriangle, Trash2, ListChecks, MapPin, Search } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReceivingDetail {
  id: number
  pallet_id: string 
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

  // State Baru untuk Fitur Search Lokasi & Validasi
  const [locSearch, setLocSearch] = useState('')
  const [locError, setLocError] = useState('')

  // State Review
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

  const getAllocatedLocations = (detail: DetailItem, receivingId: number) => {
    const serverLocs = (detail.putaway_details || [])
      .filter(p => p.receiving_detail_id === receivingId)
      .map(p => p.dim_location?.name || `Lokasi ID: ${p.location_id}`)

    const cacheLocs = putawayCache
      .filter(p => p.receivingDetailId === receivingId)
      .map(p => p.location_name)

    const allLocs = [...serverLocs, ...cacheLocs]
    return Array.from(new Set(allLocs)) 
  }

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
    const scannedVal = scanInput.trim().toUpperCase()
    if (!scannedVal) return

    const foundRow = rows.find(r => r.recv.pallet_id?.toUpperCase() === scannedVal)

    if (!foundRow) {
      toast.error(`Pallet ID [${scannedVal}] tidak ditemukan di dokumen ini!`)
    } else if (foundRow.remaining <= 0) {
      toast.error(`Pallet ID [${scannedVal}] sudah dialokasikan sepenuhnya!`)
    } else {
      handleOpenModal(foundRow.detail, foundRow.recv, foundRow.remaining)
    }

    setScanInput('')
  }

  // ── Actions: Modal & Queue ───────────────────────────────────────────────
  const handleOpenModal = (detail: DetailItem, recv: ReceivingDetail, remaining: number) => {
    setModalData({
      detail,
      receivingId: recv.id,
      pallet_id: recv.pallet_id,
      remaining,
      is_damage: recv.is_damage,
    })
    setSelectedLocId('')
    setLocSearch('')
    setLocError('')
    setQty(remaining > 0 ? remaining : 1)
  }

  const handleAddToCache = () => {
    if (!modalData) return

    if (!selectedLocId) {
      setLocError('⚠️ Silakan pilih lokasi rak terlebih dahulu dari daftar di atas!')
      return
    }

    if (qty <= 0) { setLocError('⚠️ Qty harus lebih besar dari 0'); return }
    if (qty > modalData.remaining) { setLocError(`⚠️ Maksimal alokasi adalah ${modalData.remaining}`); return }

    const loc = locations.find(l => l.id.toString() === selectedLocId)
    if (!loc) { setLocError('⚠️ Lokasi tidak valid'); return }

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

    toast.success(`Pallet [${modalData.pallet_id}] masuk antrean lokasi ${loc.name}.`)
    setModalData(null)

    setTimeout(() => scanInputRef.current?.focus(), 100)
  }

  // ── Actions: BULK API (Putaway) ────────────────────────────────────────────
  const handleFinalConfirm = async () => {
    setConfirming(true)
    try {
      const payload = putawayCache.map(item => ({
        receiving_detail_id: item.receivingDetailId,
        location_id: item.location_id,
        qty: item.qty
      }))

      const res = await fetch('/api/inbound/putaway-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: payload,
          headerId: headerId
        }),
      })

      if (!res.ok) {
        let msg = 'Gagal menyimpan putaway'
        try { const d = await res.json(); msg = d.error || msg } catch { }
        throw new Error(msg)
      }

      setPutawayCache([])
      setShowReview(false)
      toast.success('Semua penempatan lokasi berhasil disimpan ke sistem!')
      await onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setConfirming(false)
    }
  }

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(locSearch.toLowerCase()) ||
    (loc.barcode && loc.barcode.toLowerCase().includes(locSearch.toLowerCase()))
  )

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

  if (headerStatus !== 'RECEIVING' && headerStatus !== 'PUTAWAY' && headerStatus !== 'GRN') {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 font-semibold text-center flex items-center justify-center gap-2">
        <AlertTriangle size={20} /> Proses Receiving belum selesai. Tidak dapat memproses Putaway.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!(allPutawayDone || headerStatus === 'GRN') && ( 
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex gap-2 items-center text-slate-700 font-semibold">
            <CheckCircle2 size={20} className="text-green-600" /> Semua item yang diterima telah dialokasikan ke lokasi masing-masing. Lanjut ke proses GRN.
          </div>
        </div>
      )}

      {/* ── AREA SCANNER BARCODE ── */}
      {!allPutawayDone && (
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <h1 className='font-bold py-1 px-2 text-slate-800'>Pallet ID</h1>
          <form onSubmit={handleScanSubmit} className="w-full relative">
            <input
              ref={scanInputRef}
              type="text"
              placeholder="Search Pallet ID"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="w-full pl-4 pr-20 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl 
          focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 
          outline-none text-slate-700 font-bold transition-all"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-4 bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Tabel Utama Daftar Putaway */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-end items-center bg-slate-50/50">
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
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">Product Status</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-center">Location</th>
                <th className="px-6 py-4 text-right"></th>
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
                  const allocatedLocs = getAllocatedLocations(row.detail, row.recv.id)

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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-bold bg-red-50 text-red-600 border border-red-100"><AlertTriangle size={12} /> Damage</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle2 size={12} /> Good</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">
                        {row.recv.qty_received} <span className="text-xs text-slate-400">{uomName}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {allocatedLocs.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-1.5 max-w-[150px] mx-auto">
                            {allocatedLocs.map((loc, i) => (
                              <span key={i} className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold uppercase rounded-md">
                                {loc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Unallocated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(row.detail, row.recv, row.remaining)}
                          disabled={isFull}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Edit3 size={14} />
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
        <Modal
          onClose={() => setModalData(null)}
          title="Scan / Pilih Lokasi Rak"
          className="w-[95vw] max-w-2xl" 
        >
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

            {/* Input Search Lokasi Baru */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-2">
                Pilih / Scan Lokasi Rak <MapPin size={16} className="text-slate-400" />
              </label>

              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama rak atau barcode untuk mencari..."
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-white border-2 rounded-xl font-medium focus:ring-4 outline-none transition-all ${locError ? 'border-red-400 focus:border-red-600 focus:ring-red-100' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 text-slate-700'
                    }`}
                />
              </div>

              {/* Teks Validasi Error */}
              {locError && (
                <p className="text-red-500 text-xs font-bold mt-2 animate-pulse">{locError}</p>
              )}

              {/* Daftar Scrollable */}
              <div className="mt-3 h-56 overflow-y-auto border-2 border-slate-100 rounded-xl bg-slate-50 p-1.5 space-y-1 shadow-inner">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map(loc => {
                    const isSelected = selectedLocId === loc.id.toString()
                    return (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setSelectedLocId(loc.id.toString())
                          setLocError('') 
                        }}
                        className={`cursor-pointer p-3 rounded-lg flex items-center justify-between border-2 transition-all ${isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'border-transparent hover:bg-slate-200'
                          }`}
                      >
                        <div>
                          <p className={`font-bold text-sm ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{loc.name}</p>
                          {loc.barcode && <p className="text-xs font-mono text-slate-500">{loc.barcode}</p>}
                        </div>
                        {isSelected && <CheckCircle2 size={18} className="text-blue-600" />}
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-6">
                    <Search size={24} className="text-slate-300" />
                    <p className="text-sm font-medium">Lokasi tidak ditemukan</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setModalData(null)}>Batal</Button>
              <Button onClick={handleAddToCache} className="bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2 px-6 py-2.5">
                <CheckCircle2 size={18} /> Konfirmasi Lokasi
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Review Akhir */}
      {showReview && (
        <Modal onClose={() => setShowReview(false)} title="Review Antrean Putaway" className="w-[90vw] max-w-5xl">
          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Pallet ID</th>
                  <th className="px-6 py-4">Product Code</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-center">Lokasi</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {putawayCache.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-slate-500">Antrean kosong</td></tr>
                ) : (
                  putawayCache.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 ${item.is_damage ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-mono font-bold text-slate-700">
                        {item.pallet_id}
                        {item.is_damage && <span className="block mt-1 text-[10px] text-red-600 font-bold tracking-wider">⚠ RUSAK</span>}
                      </td>
                      <td className='pl-5'>
                        <p className="font-semibold text-slate-800">{item.product_code}</p> 
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{item.product_name}</p>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700 text-md">
                        {item.qty}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-md">
                          {item.location_name}
                        </span>
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