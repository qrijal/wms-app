'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'
import { Save, X, Plus } from 'lucide-react'

interface AddLocationButtonProps {
  role: string
  warehouseId: number | null
  warehouses: any[] // hanya untuk superadmin
}

export default function AddLocationButton({
  role,
  warehouseId,
  warehouses,
}: AddLocationButtonProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    barcode: '',
    warehouse_id: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const warehouseOptions = warehouses.map((w: any) => ({
    value: String(w.id),
    label: w.name,
  }))

  // Mengunci scroll layar belakang saat modal terbuka
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [open])

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) {
      setError('Nama lokasi harus diisi')
      return
    }

    if (role === 'superadmin' && !form.warehouse_id) {
      setError('Pilih warehouse terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      const body: any = {
        name: form.name,
        barcode: form.barcode || null,
      }
      if (role === 'superadmin') {
        body.warehouse_id = form.warehouse_id
      }

      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menambah lokasi')
      }

      setOpen(false)
      setForm({ name: '', barcode: '', warehouse_id: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
      >
        <Plus size={16} /> Tambah Lokasi
      </button>

      {open && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 transition-opacity"
          onClick={() => setOpen(false)} // Klik di luar area putih akan menutup modal
        >
          {/* Kontainer Putih Modal (stopPropagation agar klik di dalam form tidak menutup modal) */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden flex flex-col"
          >
            <div className="p-6">
              {/* Header Modal */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div className="pr-4">
                  <h2 className="text-lg font-bold text-slate-800">Tambah Lokasi Baru</h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Masukkan detail lokasi rak atau area baru di dalam gudang.
                  </p>
                </div>
                <button 
                  onClick={() => setOpen(false)} 
                  className="text-slate-400 hover:text-slate-700 transition-colors shrink-0 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {error && <div className="mt-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

              {/* Body / Form Inputs */}
              <div className="py-5 space-y-4">
                {role === 'superadmin' && (
                  <Select
                    label="Warehouse"
                    value={form.warehouse_id}
                    onChange={e => setForm({ ...form, warehouse_id: e.target.value })}
                    options={[
                      { value: '', label: '-- Pilih Warehouse --' },
                      ...warehouseOptions,
                    ]}
                  />
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Nama Lokasi
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: RAK-A01, BLOK-B"
                    className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Barcode (Opsional)
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={e => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Contoh: LOC-A01-001"
                    className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Footer Modal */}
              <div className="flex justify-end items-center gap-5 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading} 
                  className="bg-[#054CB6] hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Menyimpan...' : (
                    <>
                      <Save size={16} /> Simpan Lokasi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}