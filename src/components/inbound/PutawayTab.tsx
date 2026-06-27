// components/inbound/PutawayTab.tsx
'use client'
import { useState, useEffect } from 'react'
import ScanQRInput from '@/components/ScanQRInput'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReceivingDetail {
  id: number
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
  product_code: string
  product_name: string
  location_id: number
  location_name: string
  location_barcode: string
  qty: number
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
  headerId,
  headerStatus,
  onRefresh,
}: PutawayTabProps) {
  const [details, setDetails] = useState<DetailItem[]>(initialDetails)
  const [selectedReceiving, setSelectedReceiving] = useState<{
    detail: DetailItem
    receivingId: number
    remaining: number
    is_damage: boolean
  } | null>(null)
  const [scannedLocation, setScannedLocation] = useState<any>(null)
  const [qty, setQty] = useState<number>(0)
  const [putawayCache, setPutawayCache] = useState<PutawayItem[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { setDetails(initialDetails) }, [initialDetails])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getRemainingForReceiving = (detail: DetailItem, receivingId: number) => {
    const receiving = detail.receiving_details?.find(r => r.id === receivingId)
    if (!receiving) return 0
    // Total putaway dari server (putaway_details) + cache
    const serverPutaway = (detail.putaway_details || [])
      .filter(p => p.receiving_detail_id === receivingId)
      .reduce((sum, p) => sum + (p.qty || 0), 0)
    const cachePutaway = putawayCache
      .filter(p => p.receivingDetailId === receivingId)
      .reduce((sum, p) => sum + p.qty, 0)
    return receiving.qty_received - serverPutaway - cachePutaway
  }

  // ── Pilih receiving detail ───────────────────────────────────────────────
  const handleSelectReceiving = (detail: DetailItem, receivingId: number) => {
    const remaining = getRemainingForReceiving(detail, receivingId)
    if (remaining <= 0) return
    const receiving = detail.receiving_details?.find(r => r.id === receivingId)
    setSelectedReceiving({
      detail,
      receivingId,
      remaining,
      is_damage: receiving?.is_damage || false,
    })
    setScannedLocation(null)
    setQty(0)
    setError('')
  }

  // ── Scan lokasi ──────────────────────────────────────────────────────────
  const handleLocationScan = async (barcode: string) => {
    if (!selectedReceiving) return
    setError('')
    try {
      const res = await fetch(`/api/locations/by-barcode?barcode=${encodeURIComponent(barcode)}`)
      if (!res.ok) throw new Error('Lokasi tidak valid')
      const loc = await res.json()
      setScannedLocation(loc)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // ── Tambahkan ke cache ───────────────────────────────────────────────────
  const handleAddToCache = () => {
    if (!selectedReceiving || !scannedLocation || qty <= 0) {
      setError('Lokasi dan qty harus valid')
      return
    }
    if (qty > selectedReceiving.remaining) {
      setError(`Maksimal ${selectedReceiving.remaining}`)
      return
    }

    // Tambahkan ke cache
    setPutawayCache(prev => [
      ...prev,
      {
        receivingDetailId: selectedReceiving.receivingId,
        product_code: selectedReceiving.detail.product_code,
        product_name: selectedReceiving.detail.dim_products?.name || selectedReceiving.detail.product_code,
        location_id: scannedLocation.id,
        location_name: scannedLocation.name,
        location_barcode: scannedLocation.barcode || '',
        qty,
      },
    ])

    // ✅ Update remaining secara lokal agar UI langsung berubah
    setSelectedReceiving(prev => {
      if (!prev) return null
      return { ...prev, remaining: prev.remaining - qty }
    })

    setSuccess(`Ditambahkan ke cache: ${qty} unit → ${scannedLocation.name}`)
    setScannedLocation(null)
    setQty(0)
  }

  // ── Hapus / edit cache ───────────────────────────────────────────────────
  const removePutawayItem = (index: number) =>
    setPutawayCache(prev => prev.filter((_, i) => i !== index))

  const updatePutawayItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) { removePutawayItem(index); return }
    const item = putawayCache[index]
    if (!item) return
    // Validasi qty terhadap sisa sebenarnya
    const detail = details.find(d => d.receiving_details?.some(r => r.id === item.receivingDetailId))
    if (detail) {
      const remaining = getRemainingForReceiving(detail, item.receivingDetailId) + item.qty
      if (newQty > remaining) return
    }
    setPutawayCache(prev =>
      prev.map((p, i) => (i === index ? { ...p, qty: newQty } : p))
    )
  }

  // ── Konfirmasi akhir ────────────────────────────────────────────────────
  const handleFinalConfirm = async () => {
    setConfirming(true)
    setError('')
    try {
      for (const item of putawayCache) {
        const res = await fetch('/api/inbound/putaway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiving_detail_id: item.receivingDetailId,
            location_id: item.location_id,
            qty: item.qty,
          }),
        })
        if (!res.ok) {
          let msg = 'Gagal menyimpan putaway'
          try { const d = await res.json(); msg = d.error || msg } catch {}
          throw new Error(msg)
        }
      }
      setPutawayCache([])
      setShowReview(false)
      setSuccess('Semua item berhasil diputaway!')
      await onRefresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  // ── Guard render ─────────────────────────────────────────────────────────
  if (headerStatus === 'GRN') {
    return <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center">✅ Putaway telah selesai. Inbound sudah GRN.</div>
  }
  if (headerStatus !== 'RECEIVING' && headerStatus !== 'PUTAWAY') {
    return <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 font-semibold text-center">⚠️ Proses Receiving belum selesai.</div>
  }

  // Cek apakah semua receiving detail sudah diputaway (termasuk cache)
  const allPutawayDone = details.every(detail =>
    (detail.receiving_details || []).every(recv => getRemainingForReceiving(detail, recv.id) === 0)
  )
  if (allPutawayDone && putawayCache.length === 0) {
    return <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center">✅ Semua item sudah diputaway. Lanjut ke GRN.</div>
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {!selectedReceiving ? (
        // ── Daftar receiving detail ──
        <div>
          <h3 className="font-semibold text-lg mb-3">Pilih Item untuk Putaway</h3>
          <div className="space-y-2">
            {details.map(detail =>
              (detail.receiving_details || []).map(recv => {
                const remaining = getRemainingForReceiving(detail, recv.id)
                if (remaining <= 0) return null
                return (
                  <div
                    key={`${detail.id}-${recv.id}`}
                    onClick={() => handleSelectReceiving(detail, recv.id)}
                    className="cursor-pointer bg-white p-4 rounded-xl shadow border border-gray-200 hover:border-blue-400 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium">{detail.dim_products?.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{detail.product_code}</span>
                      <span className="text-xs ml-2">{recv.is_damage ? '⚠ Damage' : 'Normal'}: {recv.qty_received} unit</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">{remaining} sisa</div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        // ── Mode putaway ──
        <div className="bg-white p-6 rounded-xl shadow border space-y-3">
          <h3 className="font-bold text-lg">Putaway: {selectedReceiving.detail.dim_products?.name}</h3>
          <p>Kode: {selectedReceiving.detail.product_code}</p>
          <p>Status: {selectedReceiving.is_damage ? '⚠ Damage' : 'Normal'}</p>
          <p>Sisa: {selectedReceiving.remaining} unit</p>

          {!scannedLocation ? (
            <ScanQRInput onScan={handleLocationScan} placeholder="Scan barcode lokasi tujuan..." />
          ) : (
            <div className="space-y-3">
              <p>Lokasi: <strong>{scannedLocation.name}</strong> ({scannedLocation.barcode})</p>
              <Input
                label="Qty"
                type="number"
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
                min={1}
                max={selectedReceiving.remaining}
              />
              <div className="flex gap-3">
                <Button onClick={handleAddToCache}>Tambahkan ke Cache</Button>
                <Button variant="secondary" onClick={() => { setScannedLocation(null); setQty(0) }}>Ganti Lokasi</Button>
              </div>
            </div>
          )}
          <Button variant="secondary" onClick={() => { setSelectedReceiving(null); setScannedLocation(null); setQty(0); setError('') }}>
            Kembali ke Daftar
          </Button>
        </div>
      )}

      {/* ── Tombol Review ── */}
      {putawayCache.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setShowReview(true)}>Review & Konfirmasi ({putawayCache.length})</Button>
        </div>
      )}

      {/* ── List Detail Putaway per receiving detail ── */}
      <div>
        <h3 className="font-semibold text-lg mb-3">Detail Putaway</h3>
        <div className="space-y-2">
          {details.map(detail =>
            (detail.receiving_details || []).map(recv => {
              const serverPutaway = (detail.putaway_details || []).filter(p => p.receiving_detail_id === recv.id)
              const cacheItems = putawayCache.filter(p => p.receivingDetailId === recv.id)
              const allPutaway = [
                ...serverPutaway.map(p => ({ location_name: p.dim_location?.name || `Lokasi ${p.location_id}`, qty: p.qty })),
                ...cacheItems.map(p => ({ location_name: `${p.location_name} (cache)`, qty: p.qty })),
              ]
              if (allPutaway.length === 0) return null
              return (
                <div key={`${detail.id}-${recv.id}`} className="bg-white p-4 rounded-xl shadow border">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="font-mono text-xs">{detail.product_code}</span>
                    <span className="font-medium">{detail.dim_products?.name}</span>
                    <span className="text-gray-500">{recv.is_damage ? '⚠ Damage' : 'Normal'}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {allPutaway.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm ml-4">
                        <span>{p.location_name}</span>
                        <span className="font-semibold">{p.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Modal Review ── */}
      {showReview && (
        <Modal onClose={() => setShowReview(false)} title="Konfirmasi Putaway">
          <div className="max-h-96 overflow-y-auto space-y-2">
            {putawayCache.map((item, idx) => (
              <div key={idx} className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-gray-500">{item.product_code}</p>
                    <p className="text-xs text-blue-600">{item.location_name} ({item.location_barcode})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-16 border rounded px-2 py-1 text-sm"
                      value={item.qty}
                      onChange={e => updatePutawayItemQty(idx, Number(e.target.value))}
                      min={1}
                    />
                    <button onClick={() => removePutawayItem(idx)} className="text-red-500 text-xs">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowReview(false)}>Tutup</Button>
            <Button onClick={handleFinalConfirm} disabled={confirming || putawayCache.length === 0}>
              {confirming ? 'Menyimpan...' : 'Konfirmasi Semua'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}