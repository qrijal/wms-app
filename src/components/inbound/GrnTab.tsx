'use client'
import { useState, useEffect } from 'react'
import Alert from '@/components/ui/Alert'

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
  product_code: string
  qty: number
  qty_received: number
  qty_putaway: number
  dim_products?: { name: string }
  receiving_details?: ReceivingDetail[]
  putaway_details?: PutawayDetail[]
}

interface GrnTabProps { 
  headerId: number
  details: DetailItem[]
  currentStatus: string
  onRefresh: () => void
}

export default function GrnTab({ headerId, details, currentStatus, onRefresh }: GrnTabProps) {
  const [status, setStatus] = useState(currentStatus || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (currentStatus) setStatus(currentStatus)
  }, [currentStatus])

  useEffect(() => {
    if (!headerId) return
    fetch(`/api/inbound/header/${headerId}/details`)
      .then(r => r.json())
      .then(data => {
        if (data?.status) setStatus(data.status)
      })
      .catch(() => {})
  }, [headerId])

  const allPutawayDone = details.every(d => d.qty_received <= d.qty_putaway)
  const donePutaway = details.filter(d => d.qty_received <= d.qty_putaway).length
  const totalItems = details.length

  const handleGrn = async () => {
    setShowConfirm(false)
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/inbound/header/${headerId}/grn`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal GRN')
      }
      setSuccess('GRN berhasil! Stok sudah ditambahkan.')
      onRefresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Tampilan setelah GRN: daftar card hasil putaway
  if (status === 'GRN') {
    return (
      <div className="space-y-5">
        {success && <Alert type="success" message={success} />}
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center">
          ✅ GRN sudah dibuat. Inbound selesai.
        </div>

        <div>
          <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
            Detail Hasil Putaway
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {details.map(detail => {
              const putaway = detail.putaway_details || []
              const putawayByReceiving: Record<number, PutawayDetail[]> = {}
              putaway.forEach(p => {
                const key = p.receiving_detail_id
                if (!putawayByReceiving[key]) putawayByReceiving[key] = []
                putawayByReceiving[key].push(p)
              })

              return (detail.receiving_details || []).map(recv => {
                const associatedPutaway = putawayByReceiving[recv.id] || []
                const totalPutaway = associatedPutaway.reduce((sum, p) => sum + Number(p.qty), 0)
                if (totalPutaway === 0) return null

                return (
                  <div
                    key={`${detail.id}-${recv.id}`}
                    className={`bg-white p-4 rounded-xl shadow border ${
                      recv.is_damage ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-1 mb-3">
                      <span className="text-xs font-mono text-gray-400">
                        {detail.product_code?.toLowerCase()}
                      </span>
                      <span className="font-medium text-gray-800">
                        {detail.dim_products?.name || '-'}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        recv.is_damage ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {recv.is_damage ? 'Damage' : 'Normal'}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Diterima:</span>
                        <span className="font-semibold">{recv.qty_received}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Diputaway:</span>
                        <span className="font-semibold">{totalPutaway}</span>
                      </div>
                      {associatedPutaway.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Lokasi:</p>
                          {associatedPutaway.map(p => (
                            <div key={p.id} className="flex justify-between text-xs ml-1">
                              <span>{p.dim_location?.name || `Lokasi ${p.location_id}`}</span>
                              <span className="font-medium">{p.qty}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })}
          </div>
        </div>
      </div>
    )
  }

  // Tampilan sebelum GRN
  return (
    <div className="space-y-5">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-lg text-gray-800">Goods Received Note</h3>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1.5">
            <span>Putaway selesai</span>
            <span className="font-semibold">{donePutaway} / {totalItems} item</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(donePutaway / totalItems) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={loading || !allPutawayDone}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            {loading ? 'Memproses...' : 'Konfirmasi GRN'}
          </button>
        </div>
      </div>

      {/* Detail cards sebelum GRN */}
      <div>
        <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Detail Item Putaway</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {details.map(detail => {
            const putaway = detail.putaway_details || []
            const putawayByReceiving: Record<number, PutawayDetail[]> = {}
            putaway.forEach(p => {
              const key = p.receiving_detail_id
              if (!putawayByReceiving[key]) putawayByReceiving[key] = []
              putawayByReceiving[key].push(p)
            })

            return (detail.receiving_details || []).map(recv => {
              const associatedPutaway = putawayByReceiving[recv.id] || []
              const totalPutaway = associatedPutaway.reduce((sum, p) => sum + Number(p.qty), 0)
              if (recv.qty_received === 0 && totalPutaway === 0) return null

              return (
                <div
                  key={`${detail.id}-${recv.id}`}
                  className={`bg-white p-4 rounded-xl shadow border ${
                    recv.is_damage ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col gap-1 mb-3">
                    <span className="text-xs font-mono text-gray-400">
                      {detail.product_code?.toLowerCase()}
                    </span>
                    <span className="font-medium text-gray-800">
                      {detail.dim_products?.name || '-'}
                    </span>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        recv.is_damage ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {recv.is_damage ? '⚠ Damage' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Diterima:</span>
                      <span className="font-semibold">{recv.qty_received}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diputaway:</span>
                      <span className={`font-semibold ${totalPutaway >= recv.qty_received ? 'text-green-600' : 'text-amber-600'}`}>
                        {totalPutaway}
                      </span>
                    </div>
                    {associatedPutaway.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Lokasi Putaway:</p>
                        {associatedPutaway.map(p => (
                          <div key={p.id} className="flex justify-between text-xs ml-1">
                            <span>{p.dim_location?.name || `Lokasi ${p.location_id}`}</span>
                            <span className="font-medium">{p.qty}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          })}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-center text-xl font-bold text-gray-800 mb-1">Konfirmasi GRN</h2>
            <p className="text-center text-sm text-gray-500 mb-6">Semua item akan dicatat sebagai diterima dan stok diperbarui.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={handleGrn} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold">Ya, GRN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}