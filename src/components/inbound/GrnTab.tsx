'use client'
import { useState, useEffect } from 'react'
import Alert from '@/components/ui/Alert'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { CheckCircle2, PackageCheck, AlertTriangle, FileText, MapPin } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReceivingDetail {
  id: number
  pallet_id: string // Ditambahkan agar bisa menampilkan ID Pallet
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
  dim_products?: { name: string; uom?: { name: string } | null }
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

  // ─── Logika Kalkulasi Akurat (Berdasarkan Qty Fisik) ───────────────────────
  const totalOrdered = details.reduce((sum, d) => sum + d.qty, 0)
  const totalReceived = details.reduce((sum, d) => sum + (d.qty_received || 0), 0)
  const totalPutaway = details.reduce((sum, d) => sum + (d.qty_putaway || 0), 0)

  // GRN baru bisa ditekan jika ada barang yang di-receive, dan SEMUA yang di-receive sudah di-putaway
  const isReadyForGrn = totalReceived > 0 && totalPutaway >= totalReceived
  const progressPercent = totalReceived > 0 ? Math.min((totalPutaway / totalReceived) * 100, 100) : 0

  // ─── Flattening Data (Mengekstrak per Pallet ID) ───────────────────────────
  // Kita urai data dari level Produk -> level Pallet -> level Lokasi Rak
  const finalCheckList = details.flatMap(detail => {
    const recvDetails = detail.receiving_details || [];
    const putDetails = detail.putaway_details || [];
    const uomName = detail.dim_products?.uom?.name || 'unit';

    return recvDetails.flatMap(recv => {
      const relatedPutaways = putDetails.filter(p => p.receiving_detail_id === recv.id);

      // Jika pallet ini sudah di-receive tapi belum sempat masuk rak (putaway)
      if (relatedPutaways.length === 0) {
        return [{
          unique_key: `recv-${recv.id}`,
          pallet_id: recv.pallet_id || '-',
          product_code: detail.product_code,
          product_name: detail.dim_products?.name || '-',
          qty: recv.qty_received,
          uom: uomName,
          location: 'Belum Dialokasikan',
          is_damage: recv.is_damage,
          is_ready: false
        }];
      }

      // Jika pallet sudah masuk rak (bisa 1 pallet utuh, atau dipecah ke beberapa rak)
      return relatedPutaways.map(p => ({
        unique_key: `put-${p.id}`,
        pallet_id: recv.pallet_id || '-',
        product_code: detail.product_code,
        product_name: detail.dim_products?.name || '-',
        qty: p.qty,
        uom: uomName,
        location: p.dim_location?.name || `Rak ${p.location_id}`,
        is_damage: recv.is_damage,
        is_ready: true
      }));
    });
  });

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleGrn = async () => {
    setShowConfirm(false)
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/inbound/header/${headerId}/grn`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal memproses GRN')
      }
      setSuccess('GRN berhasil dibuat! Stok telah ditambahkan ke sistem.')
      onRefresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Renders ───────────────────────────────────────────────────────────────
  const isDone = status === 'GRN' || status === 'COMPLETED'

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {isDone ? (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex flex-col sm:flex-row items-center sm:justify-start justify-center gap-4 shadow-sm text-center sm:text-left">
          <CheckCircle2 size={32} className="text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-bold text-xl">Goods Received Note (GRN) Selesai</h3>
            <p className="text-sm text-emerald-700/90 mt-1">Dokumen inbound telah dikunci dan stok barang fisik sudah resmi ditambahkan ke dalam database WMS.</p>
          </div>
          <div className="sm:ml-auto mt-2 sm:mt-0">
             <Button onClick={() => window.print()} variant="secondary" className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-bold">
               Cetak Bukti GRN
             </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Review & Terbitkan GRN</h3>
                <p className="text-sm text-slate-500">Pengecekan final fisik pallet vs lokasi rak sebelum menutup Inbound.</p>
              </div>
            </div>
            
            <div className="text-left sm:text-right shrink-0 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Total Diterima</p>
              <p className="text-xl font-black text-slate-800">{totalReceived} <span className="text-sm font-medium text-slate-500">unit</span></p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className={progressPercent === 100 ? 'text-emerald-600' : 'text-blue-600'}>
                Progress Lokasi Pallet (Putaway)
              </span>
              <span className="text-slate-700">{totalPutaway} / {totalReceived} Dialokasikan</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={loading || !isReadyForGrn}
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 font-bold text-white flex items-center gap-2"
            >
              <PackageCheck size={18} />
              {loading ? 'Memproses...' : 'Terbitkan Dokumen GRN'}
            </Button>
          </div>
        </div>
      )}

      {/* Tabel Detail Final Checking (Per Pallet) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:hidden">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">Daftar Pengecekan Fisik Pallet</h3>
            <p className="text-xs text-slate-500 mt-1">Cocokkan ID Pallet fisik dengan lokasi rak yang tertera di bawah ini.</p>
          </div>
          <div className="text-sm font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Total Pallet: {finalCheckList.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 w-40">Pallet ID</th>
                <th className="px-6 py-4">Deskripsi Produk & SKU</th>
                <th className="px-6 py-4 text-center">Kondisi</th>
                <th className="px-6 py-4 text-center">Lokasi Rak</th>
                <th className="px-6 py-4 text-center w-32">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {finalCheckList.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Belum ada barang yang melalui tahap Receiving.</td></tr>
              ) : (
                finalCheckList.map((row) => (
                  <tr key={row.unique_key} className={`hover:bg-slate-50 transition-colors ${row.is_damage ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded">{row.pallet_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{row.product_name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{row.product_code}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.is_damage ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                          <AlertTriangle size={12}/> RUSAK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 size={12}/> BAGUS
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.is_ready ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                          <MapPin size={14} className="text-slate-400" /> {row.location}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          {row.location}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-slate-800 text-base">{row.qty}</span> <span className="text-xs font-normal text-slate-500">{row.uom}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Pengecekan Final */}
      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)} title="Konfirmasi Final GRN" className="w-[90vw] max-w-5xl">
          <div className="space-y-4">
            {/* Warning Alert */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <PackageCheck className="text-emerald-600 mt-0.5 shrink-0" size={24} />
              <div>
                <p className="text-emerald-800 font-bold text-lg">Apakah hasil pengecekan fisik sudah sesuai?</p>
                <p className="text-emerald-700/80 text-sm mt-1">Pastikan data di bawah ini sudah akurat. Dokumen yang telah di-GRN tidak dapat diedit kembali dan stok akan otomatis bertambah ke dalam lokasi rak yang tertera.</p>
              </div>
            </div>

            {/* Tabel Mini Preview di dalam Modal */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[45vh] flex flex-col bg-white">
              <div className="overflow-y-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th className="p-3 w-36">Pallet ID</th>
                      <th className="p-3">Produk</th>
                      <th className="p-3 text-center">Lokasi Rak</th>
                      <th className="p-3 text-center w-24">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {finalCheckList.map((row) => (
                      <tr key={`modal-${row.unique_key}`} className={row.is_damage ? 'bg-red-50/20' : ''}>
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {row.pallet_id}
                          {row.is_damage && <span className="block mt-1 text-[9px] text-red-600 tracking-wider">⚠ RUSAK</span>}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800 truncate max-w-[250px]">{row.product_name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{row.product_code}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                            {row.location}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black text-slate-800">
                          {row.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowConfirm(false)} className="px-6">Batal, Cek Ulang</Button>
              <Button onClick={handleGrn} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8">
                {loading ? 'Menyimpan...' : 'Ya, Semua Sesuai - Terbitkan GRN'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}