'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Scale, Warehouse, Save, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function AddUomButton({ role, warehouses }: { role: string; warehouses: any[] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', warehouse_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Nama satuan harus diisi'); return }
    
    setLoading(true)
    try {
      const res = await fetch('/api/uoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      
      setOpen(false)
      setForm({ name: '', warehouse_id: '' })
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus size={16} /> Tambah Satuan
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-800">Tambah Satuan Baru</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">{error}</div>}
              
              {role === 'superadmin' && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-slate-800">Warehouse</label>
                  <div className="relative">
                    <Warehouse className="absolute left-3.5 top-3 text-slate-500" size={18} />
                    <select 
                      value={form.warehouse_id} 
                      onChange={e => setForm({...form, warehouse_id: e.target.value})} 
                      className="w-full pl-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Global (Tanpa Warehouse)</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-800">Nama Satuan (UOM)</label>
                <div className="relative">
                  <Scale className="absolute left-3.5 top-3 text-slate-500" size={18} />
                  <input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    className="w-full pl-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                    placeholder="Contoh: Pcs, Box, Kg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-blue-700">Batal</button>
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                  <Save size={18}/> {loading ? 'Menyimpan...' : 'Simpan Satuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}