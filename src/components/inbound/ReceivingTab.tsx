// src/components/inbound/ReceivingTab.tsx
'use client'
import React, { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { CheckCircle2, AlertTriangle, Plus, Trash2, Edit3, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import PrintPalletModal from './PrintPalletModal' // Pastikan file ini sudah dibuat satu folder

// ─── Types ───────────────────────────────────────────────────────────────────
interface DetailItem {
  id: number
  product_id: number
  product_code: string
  batch_number: string
  qty: number
  pallet_id: string
  qty_received: number
  expired_date?: string
  dim_products?: {
    name: string;
    dim_product_uom?: { name?: string; uom_name?: string } | { name?: string; uom_name?: string }[] | null
  }
}

interface ReceivingTabProps {
  details?: DetailItem[] // Tambahkan opsional agar tidak error jika delay
  headerId: number
  headerStatus: string
  onRefresh: () => Promise<void>
}

interface PalletRow {
  id: string
  batch_number: string
  expired_date?: string
  qty: string
}

// Helper function untuk mengambil nama UOM dengan aman dari Object atau Array
const getUomName = (item: DetailItem) => {
  const uomData = item.dim_products?.dim_product_uom
  if (!uomData) return ''
  // Jika relasi mereturn array (1-to-many fallback)
  if (Array.isArray(uomData)) {
    return uomData[0]?.name || uomData[0]?.uom_name || ''
  }
  // Jika relasi mereturn object (1-to-1)
  return uomData.name || uomData.uom_name || ''
}

export default function ReceivingTab({ details = [], headerId, headerStatus, onRefresh }: ReceivingTabProps) {
  const [modalData, setModalData] = useState<DetailItem | null>(null)
  const [palletRows, setPalletRows] = useState<PalletRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // State untuk Print Modal Modular
  const [printModalData, setPrintModalData] = useState<any[] | null>(null)
  
  const router = useRouter()

  // ─── Live Counting Logic (Dipastikan Number) ───────────────────────────────
  const currentTotalInput = palletRows.reduce((sum, row) => sum + (Number(row.qty) || 0), 0)
  
  const remainingQty = modalData
    ? (Number(modalData.qty) - Number(modalData.qty_received) - currentTotalInput)
    : 0

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleOpenModal = (detail: DetailItem) => {
    const safeStatus = headerStatus?.trim().toUpperCase()

    if (safeStatus !== 'DRAFT' && safeStatus !== 'RECEIVING') {
      toast.error(`Tidak bisa menerima barang. Status dokumen saat ini adalah "${safeStatus}". Penerimaan fisik hanya bisa dilakukan saat status DRAFT!`, {
        duration: 4000
      })
      return
    }

    setModalData(detail)
    setPalletRows([{
      id: `PLT-${Date.now()}`,
      batch_number: detail.batch_number || '',
      expired_date: detail.expired_date ? detail.expired_date.split('T')[0] : '',
      qty: ''
    }])
  }

  const handleAddRow = () => {
    if (remainingQty <= 0) {
      toast.error('Kuantitas (Qty) DO sudah terpenuhi! Tidak bisa menambah pallet lagi.')
      return
    }
    setPalletRows(prev => [
      ...prev,
      {
        id: `PLT-${Date.now()}-${prev.length}`,
        batch_number: modalData?.batch_number || '',
        expired_date: modalData?.expired_date ? modalData.expired_date.split('T')[0] : '',
        qty: ''
      }
    ])
  }

  const handleRemoveRow = (idToRemove: string) => {
    setPalletRows(prev => prev.filter(row => row.id !== idToRemove))
  }

  const handleRowChange = (id: string, field: keyof PalletRow, value: string) => {
    setPalletRows(prev => prev.map(row => {
      if (row.id === id) {
        if (field === 'qty') {
          const numericValue = value.replace(/\D/g, '')
          return { ...row, [field]: numericValue }
        }
        return { ...row, [field]: value }
      }
      return row
    }))
  }

  const handleSave = async () => {
    const validRows = palletRows.filter(r => Number(r.qty) > 0)
    if (validRows.length === 0) {
      toast.error('Minimal isi 1 pallet dengan Qty lebih dari 0')
      return
    }

    try {
      setIsSaving(true)

      const itemsPayload = validRows.map((row) => ({
        detail_id: modalData?.id,
        qty_received: Number(row.qty),
        is_damage: false,
        pallet_id: row.id,
        batch_number: row.batch_number,
        expired_date: row.expired_date || null,
      }))

      const payload = {
        items: itemsPayload,
        headerId: headerId
      }

      const res = await fetch('/api/inbound/receiving-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Gagal menyimpan data')
      }

      toast.success('Penerimaan berhasil dicatat')
      setModalData(null) 
      if (onRefresh) {
        await onRefresh()
      }

    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Terjadi kesalahan saat menyimpan')
    } finally {
      setIsSaving(false)
    }
  }

  const allReceived = details.length > 0 && details.every(d => Number(d.qty_received) >= Number(d.qty))
  
  const handleAllPrint = async () => {
    const detailIds = details.map((d: any) => d.id).filter(Boolean)
    const res = await fetch(`/api/inbound/receiving-details?detail_ids=${detailIds.join(',')}`)
    const receivingData = await res.json()

    const printData = receivingData
      .filter((rec: any) => rec.pallet_id)
      .map((rec: any) => {
        const parentDetail = details.find((d: any) => d.id === rec.inbound_detail_id)
        return {
          palletId: rec.pallet_id,
          productCode: parentDetail?.product_code || '-',
          productName: parentDetail?.dim_products?.name || '-',
          batch: parentDetail?.batch_number || '-',
        }
      })

    if (printData.length === 0) {
      toast.error('Belum ada Pallet yang di-receive!')
      return
    }
    
    // Set data untuk memunculkan modal cetak modular
    setPrintModalData(printData) 
  }

  const currentHeaderStatus = headerStatus?.toUpperCase()

  if (currentHeaderStatus === 'CANCELED') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold text-center flex items-center justify-center gap-2">
        <AlertTriangle size={20} /> Dokumen telah dibatalkan.
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Tabel Utama Receiving ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Daftar Barang Inbound</h3>
          </div>

          {details.length > 0 && currentHeaderStatus !== 'CANCELED' && (
            <button
              onClick={handleAllPrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Printer size={16} /> Print Semua Pallet
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Product code</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-center">Qty Received</th>
                <th className="px-6 py-4 text-center">Batch</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {details.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Data kosong</td>
                </tr>
              ) : (
                details.map((item) => {
                  const isDone = Number(item.qty_received) >= Number(item.qty)
                  const uomName = getUomName(item)
                  const canReceive = currentHeaderStatus === 'DRAFT'

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-700">{item.product_code}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{item.dim_products?.name || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">
                        {item.qty} <span className="text-sm text-slate-400 font-normal ml-1">{uomName}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-blue-600">
                        {item.qty_received} <span className="text-sm text-blue-400 font-normal ml-1">{uomName}</span>
                      </td>
                      <td className='text-center'>
                        {item.batch_number}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 size={12} /> Received
                          </span>
                        ) : Number(item.qty_received) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Process
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(item)}
                          disabled={isDone}
                          title={!canReceive ? 'Hanya bisa menerima barang pada status DRAFT' : isDone ? 'Barang sudah diterima sepenuhnya' : 'Klik untuk terima barang'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Edit3 size={14} /> {isDone ? 'Edit' : 'Edit'}
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

      {/* ── Modal Input Pallet Dinamis ── */}
      {modalData && (
        <Modal
          onClose={() => setModalData(null)}
          title="Receiving"
          className="w-[95vw] max-w-4xl"
        >
          <div className="space-y-6">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="col-span-2 md:col-span-1">
                <span className="text-slate-500 block text-xs mb-1">Produk</span>
                <span className="font-semibold text-slate-800 line-clamp-2">{modalData.dim_products?.name}</span>
              </div>
              <div className="text-center border-l border-slate-200">
                <span className="text-slate-500 block text-xs mb-1">Qty DO (Total)</span>
                <span className="font-black text-xl text-slate-800">
                  {modalData.qty} <span className="text-sm font-normal text-slate-500">{getUomName(modalData)}</span>
                </span>
              </div>
              <div className="text-center border-l border-slate-200">
                <span className="text-slate-500 block text-xs mb-1">Sudah Diterima (Lalu)</span>
                <span className="font-black text-xl text-blue-600">
                  {modalData.qty_received} <span className="text-sm font-normal text-blue-400">{getUomName(modalData)}</span>
                </span>
              </div>
              <div className={`text-center border-l border-slate-200 transition-colors ${remainingQty === 0 ? 'bg-green-100/50' : remainingQty < 0 ? 'bg-red-100/50' : ''}`}>
                <span className="text-slate-500 block text-xs mb-1">Sisa Harus Diterima</span>
                <span className={`font-black text-2xl ${remainingQty === 0 ? 'text-green-600' : remainingQty < 0 ? 'text-red-600 animate-pulse' : 'text-orange-500'}`}>
                  {remainingQty} <span className="text-sm font-normal opacity-70">{getUomName(modalData)}</span>
                </span>
                {remainingQty < 0 && <span className="block text-[10px] text-red-600 font-bold mt-1">Melebihi Qty DO!</span>}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
                  <tr>
                    <th className="p-3 w-16 text-center">#</th>
                    <th className="p-3">Pallet ID (Auto)</th>
                    <th className="p-3">Batch Number</th>
                    <th className='p-3'> Expired Date</th>
                    <th className="p-3 w-32">Kuantitas</th>
                    <th className="p-3 w-16 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {palletRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-400 font-medium">{index + 1}</td>
                      <td className="p-3 font-mono text-sm font-bold text-slate-600 bg-slate-50/50">
                        Pallet {index + 1}
                      </td>
                      <td className="p-3 font-mono text-sm font-bold text-slate-500 bg-slate-50/50">{row.batch_number}</td>
                      <td className="p-3 font-mono text-sm font-bold text-slate-500 bg-slate-50/50">{row.expired_date}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={row.qty}
                          onChange={(e) => handleRowChange(row.id, 'qty', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          disabled={palletRows.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="secondary"
                onClick={handleAddRow}
                className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <Plus size={16} /> Add
              </Button>

              <div className="text-right">
                <span className="text-sm font-bold text-slate-600 mr-3">Total Input Saat Ini:</span>
                <span className="text-lg font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-lg">
                  {currentTotalInput}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
              <Button variant="secondary" onClick={() => setModalData(null)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting || remainingQty < 0 || currentTotalInput === 0}
                className="bg-slate-800 hover:bg-slate-900 text-white px-8"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>

          </div>
        </Modal>
      )}

      {/* ── Modal Print Modular ── */}
      {printModalData && (
        <PrintPalletModal 
          data={printModalData} 
          onClose={() => setPrintModalData(null)} 
        />
      )}
      
    </div>
  )
}