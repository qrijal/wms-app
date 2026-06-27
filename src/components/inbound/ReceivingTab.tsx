// components/inbound/ReceivingTab.tsx
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

interface DetailItem {
  id: number
  product_id: number
  product_code: string
  qty: number
  qty_received: number       // total dari server (setelah refresh)
  receiving_details?: ReceivingDetail[]
  dim_products?: { name: string; uom?: { name: string; conversion_factor: number } | null }
}

interface ScannedItem {
  detailId: number
  is_damage: boolean
  product_code: string
  product_name: string
  qty: number
  uomName: string
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
  const [currentProduct, setCurrentProduct] = useState<DetailItem | null>(null)
  const [qty, setQty] = useState<number>(1)
  const [isDamage, setIsDamage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { setDetails(initialDetails) }, [initialDetails])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getReceivedWithCache = (detail: DetailItem) =>
    (detail.qty_received || 0) +
    (scannedItems
      .filter(s => s.detailId === detail.id && !s.is_damage)
      .reduce((sum, s) => sum + s.qty, 0))

  const getRemaining = (detail: DetailItem) =>
    detail.qty - getReceivedWithCache(detail)

  const getUomName = (detail: DetailItem) =>
    detail.dim_products?.uom?.name || 'unit'

  const pendingItems = details.filter(d => getRemaining(d) > 0)
  const allDone = pendingItems.length === 0 && scannedItems.length === 0

  const handleScan = (code: string) => {
    setError('')
    setSuccess('')
    const normalized = code.trim().toLowerCase()
    const detail = details.find(
      d => (d.product_code || '').trim().toLowerCase() === normalized && getRemaining(d) > 0
    )
    if (!detail) { setError(`Produk "${code}" tidak ditemukan atau sudah penuh.`); return }
    setCurrentProduct(detail)
    setQty(1)
    setIsDamage(false)
  }

  const handleConfirmItem = () => {
    if (!currentProduct || qty <= 0) { setError('Qty harus > 0'); return }

    const remaining = getRemaining(currentProduct)
    if (qty > remaining) {
      setError(`Maksimal ${remaining} ${getUomName(currentProduct)}`)
      return
    }

    const uomName = getUomName(currentProduct)

    // Update cache
    const existingIdx = scannedItems.findIndex(
      s => s.detailId === currentProduct.id && s.is_damage === isDamage
    )
    if (existingIdx >= 0) {
      setScannedItems(prev =>
        prev.map((s, i) => (i === existingIdx ? { ...s, qty: s.qty + qty } : s))
      )
    } else {
      setScannedItems(prev => [
        ...prev,
        {
          detailId: currentProduct.id,
          is_damage: isDamage,
          product_code: currentProduct.product_code,
          product_name: currentProduct.dim_products?.name || currentProduct.product_code,
          qty,
          uomName,
        },
      ])
    }

    const damageLabel = isDamage ? ' ⚠ Rusak' : ''
    setSuccess(`Ditambahkan: ${qty} ${uomName}${damageLabel}`)
    setCurrentProduct(null)
    setQty(1)
    setIsDamage(false)
  }

  const removeScannedItem = (detailId: number, isDamage: boolean) =>
    setScannedItems(prev => prev.filter(s => !(s.detailId === detailId && s.is_damage === isDamage)))

  const updateScannedItemQty = (detailId: number, isDamage: boolean, newQty: number) => {
    if (newQty <= 0) { removeScannedItem(detailId, isDamage); return }
    if (!isDamage) {
      const detail = details.find(d => d.id === detailId)
      if (detail && newQty > getRemaining(detail)) return
    }
    setScannedItems(prev =>
      prev.map(s => (s.detailId === detailId && s.is_damage === isDamage) ? { ...s, qty: newQty } : s)
    )
  }

  const handleFinalConfirm = async () => {
    setConfirming(true)
    setError('')
    try {
      for (const item of scannedItems) {
        const res = await fetch(`/api/inbound/detail/${item.detailId}/receive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qty_received: item.qty,
            is_damage: item.is_damage,
          }),
        })
        if (!res.ok) {
          let msg = 'Gagal mencatat penerimaan'
          try { const d = await res.json(); msg = d.error || msg } catch {}
          throw new Error(msg)
        }
      }

      // ✅ Update state lokal dulu agar UI responsif
      setDetails(prev =>
        prev.map(detail => {
          const items = scannedItems.filter(s => s.detailId === detail.id)
          if (items.length === 0) return detail
          const additionalQty = items
            .filter(s => !s.is_damage)
            .reduce((sum, s) => sum + s.qty, 0)
          return {
            ...detail,
            qty_received: (detail.qty_received || 0) + additionalQty,
            // receiving_details tidak kita ubah di sini, karena akan di-refresh
          }
        })
      )

      setScannedItems([])
      setShowReview(false)
      setSuccess('Semua item berhasil diterima!')

      // ✅ Ambil data terbaru dari server (termasuk receiving_details baru)
      await onRefresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (headerStatus === 'GRN') {
    return <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 font-semibold text-center">GRN sudah dibuat. Penerimaan tidak bisa diubah.</div>
  }
  if (allDone) {
    return <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center">✅ Semua item sudah diterima. Lanjut ke Putaway.</div>
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {currentProduct ? (
        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h3 className="font-bold text-lg">Tambah Penerimaan</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Produk</span><p className="font-medium">{currentProduct.dim_products?.name || '-'}</p></div>
            <div><span className="text-gray-500">Kode</span><p className="font-mono font-medium">{currentProduct.product_code}</p></div>
            <div><span className="text-gray-500">Dipesan</span><p className="font-semibold">{currentProduct.qty} {getUomName(currentProduct)}</p></div>
            <div><span className="text-gray-500">Sudah Diterima</span><p className="font-semibold">{getReceivedWithCache(currentProduct)} {getUomName(currentProduct)}</p></div>
          </div>
          <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${getRemaining(currentProduct) === 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
            Sisa: {getRemaining(currentProduct)} {getUomName(currentProduct)}
          </div>
          <Input label={`Qty (${getUomName(currentProduct)})`} type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min={1} max={getRemaining(currentProduct)} />
          <div onClick={() => setIsDamage(v => !v)} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${isDamage ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isDamage ? 'bg-red-500 border-red-500' : 'border-gray-400'}`}>
              {isDamage && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div><p className="text-sm font-semibold">Barang Rusak (Damage)</p><p className="text-xs opacity-70">Centang jika barang dalam kondisi rusak</p></div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleConfirmItem}>Tambahkan</Button>
            <Button variant="secondary" onClick={() => { setCurrentProduct(null); setQty(1); setIsDamage(false) }}>Batal</Button>
          </div>
        </div>
      ) : (
        <ScanQRInput onScan={handleScan} placeholder="Scan/ketik product_code..." />
      )}

      {scannedItems.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setShowReview(true)}>Review & Konfirmasi ({scannedItems.length})</Button>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-lg mb-3">Semua Item ({details.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {details.map(detail => {
            const received = getReceivedWithCache(detail)
            const remaining = detail.qty - received
            const uomName = getUomName(detail)
            // Tampilkan juga detail damage yang sudah ada
            const damageDetails = (detail.receiving_details || []).filter(r => r.is_damage)
            return (
              <div key={detail.id} className={`bg-white p-4 rounded-xl shadow border ${remaining === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex flex-col gap-0.5 mb-3">
                  <span className="text-xs font-mono text-gray-400">{detail.product_code?.toLowerCase()}</span>
                  <span className="font-medium text-gray-800">{detail.dim_products?.name || '-'}</span>
                  <span className="text-xs text-gray-400">Satuan: {uomName}</span>
                </div>
                <div className="flex justify-between items-end text-sm">
                  <div className="space-y-0.5">
                    <div>Pesanan: <span className="font-semibold">{detail.qty} {uomName}</span></div>
                    <div>Diterima (normal): <span className={`font-semibold ${received > 0 ? 'text-blue-600' : ''}`}>{received} {uomName}</span></div>
                    {damageDetails.length > 0 && (
                      <div>Rusak: <span className="font-semibold text-red-600">{damageDetails.reduce((s, r) => s + r.qty_received, 0)} {uomName}</span></div>
                    )}
                  </div>
                  <div>{remaining === 0 ? <span className="text-green-600 text-sm font-medium">✓ Penuh</span> : <span className="text-xs text-gray-500">{remaining} {uomName} sisa</span>}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showReview && (
        <Modal onClose={() => setShowReview(false)} title="Konfirmasi Penerimaan">
          <div className="max-h-96 overflow-y-auto space-y-2">
            {scannedItems.map((item, idx) => (
              <div key={`${item.detailId}-${item.is_damage}-${idx}`} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.product_code}</p>
                    {item.is_damage && <p className="text-xs text-red-500 font-semibold">⚠ Damage</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input type="number" className="w-16 border rounded px-2 py-1 text-sm" value={item.qty} min={1} onChange={e => updateScannedItemQty(item.detailId, item.is_damage, Number(e.target.value))} />
                    <span className="text-xs text-gray-500">{item.uomName}</span>
                    <button onClick={() => removeScannedItem(item.detailId, item.is_damage)} className="text-red-500 hover:text-red-700 text-xs">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowReview(false)}>Tutup</Button>
            <Button onClick={handleFinalConfirm} disabled={confirming || scannedItems.length === 0}>{confirming ? 'Menyimpan...' : 'Konfirmasi Semua'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}