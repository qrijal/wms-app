'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Tag, Warehouse, Save, Plus, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'

interface AddBrandButtonProps {
  role: string
  warehouses: any[]
}

export default function AddBrandButton({ role, warehouses }: AddBrandButtonProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', warehouse_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!form.name.trim()) { 
      setError('Nama brand wajib diisi')
      return 
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      
      if (!res.ok) throw new Error((await res.json()).error)
      
      setOpen(false)
      setForm({ name: '', warehouse_id: '' })
      router.refresh()
    } catch (err: any) { 
      setError(err.message) 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus size={16} /> Tambah Brand
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-800">Tambah Brand</h2>
              <button 
                onClick={() => setOpen(false)} 
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="p-6 space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                {role === 'superadmin' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Warehouse</label>
                    <div className="relative">
                      <Warehouse className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <select 
                        value={form.warehouse_id} 
                        onChange={e => setForm({...form, warehouse_id: e.target.value})} 
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Global (Tanpa Warehouse)</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Nama Brand</label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      placeholder="Masukkan nama brand"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 px-6 py-5 border-t border-gray-100 bg-white">
                <button 
                  type="button" 
                  onClick={() => setOpen(false)} 
                  className="text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-70"
                >
                  <Save size={18} /> 
                  {loading ? 'Menyimpan...' : 'Simpan Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}