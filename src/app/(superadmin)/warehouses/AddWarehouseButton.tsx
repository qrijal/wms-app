//src\app\(superadmin)\warehouses\AddWarehouseButton.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@/components/ui/Alert'
import { Save, X, Plus, Building2 } from 'lucide-react'

interface AddWarehouseButtonProps {
  branches: { id: any; name: any }[];
}

export default function AddWarehouseButton({ branches }: AddWarehouseButtonProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', company_id: '', branch_id: '', location: '' })
  const [companies, setCompanies] = useState<any[]>([])
  const [availableBranches, setAvailableBranches] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open) fetchCompanies()
  }, [open])

  useEffect(() => {
    if (form.company_id) fetchBranches(form.company_id)
    else { setAvailableBranches([]); setForm(prev => ({ ...prev, branch_id: '' })) }
  }, [form.company_id])

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) setCompanies(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchBranches = async (companyId: string) => {
    try {
      const res = await fetch(`/api/branches?company_id=${companyId}`)
      if (res.ok) setAvailableBranches(await res.json())
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim() || !form.branch_id) {
      setError('Nama gudang dan branch wajib diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, branch_id: form.branch_id, location: form.location }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menambah gudang')
      setOpen(false)
      setForm({ name: '', company_id: '', branch_id: '', location: '' })
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
        <Plus size={16} /> Tambah Warehouse
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Tambah Warehouse</h2>
                  <p className="text-sm text-slate-500 mt-1">Buat gudang baru untuk cabang perusahaan Anda.</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
              </div>

              {error && <div className="mt-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

              <div className="py-5 space-y-4">
                {/* Company Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company</label>
                  <select value={form.company_id} onChange={e => setForm({...form, company_id: e.target.value})} className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none">
                    <option value="">-- Pilih Company --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Branch Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
                  <select value={form.branch_id} disabled={!form.company_id} onChange={e => setForm({...form, branch_id: e.target.value})} className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-50">
                    <option value="">-- Pilih Branch --</option>
                    {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Gudang</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Contoh: WH-Pusat-01" className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>

                {/* Location Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lokasi (Opsional)</label>
                  <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Alamat atau area gudang" className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
              </div>

              <div className="flex justify-end items-center gap-5 pt-4 border-t border-slate-100">
                <button onClick={() => setOpen(false)} className="text-sm font-semibold text-slate-600 hover:text-slate-800">Batal</button>
                <button onClick={handleSubmit} disabled={loading} className="bg-[#054CB6] hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                  {loading ? 'Menyimpan...' : <><Save size={16} /> Simpan Gudang</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}