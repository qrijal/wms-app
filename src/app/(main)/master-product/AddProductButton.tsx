'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Package, Barcode, Tag, Scale, Warehouse, Save, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'

interface AddProductButtonProps {
  role: string
  brands: any[]
  uoms: any[]
  warehouses: any[]
}

export default function AddProductButton({ role, brands, uoms, warehouses }: AddProductButtonProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', product_code: '', brand_id: '', uom_id: '', warehouse_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Nama produk harus diisi'); return }
    if (!form.product_code.trim()) { setError('Barcode harus diisi'); return }
    if (role === 'superadmin' && !form.warehouse_id) { setError('Warehouse harus dipilih'); return }
    if (!form.uom_id) { setError('UOM harus dipilih'); return }
    if (!form.brand_id) { setError('Brand harus dipilih'); return }

    setLoading(true)
    try {
      const body: any = {
        name: form.name,
        product_code: form.product_code,
        brand_id: form.brand_id,
        uom_id: form.uom_id,
      }
      if (role === 'superadmin') body.warehouse_id = form.warehouse_id

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error((await res.json()).error)

      setOpen(false)
      setForm({ name: '', product_code: '', brand_id: '', uom_id: '', warehouse_id: '' })
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah Produk</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-800">Tambah Produk</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full"><X size={20} strokeWidth={2.5} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="p-6 space-y-5">
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>}

                {role === 'superadmin' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Warehouse</label>
                    <div className="relative">
                      <Warehouse className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm appearance-none">
                        <option value=""></option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Nama Produk</label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Masukkan nama produk" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Product Code (Barcode)</label>
                  <div className="relative">
                    <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input type="text" value={form.product_code} onChange={e => setForm({...form, product_code: e.target.value})} placeholder="Masukkan barcode" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Brand</label>
                    <div className="relative">
                      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <select value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm appearance-none">
                        <option value="">--Brand--</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">UOM (Satuan)</label>
                    <div className="relative">
                      <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <select value={form.uom_id} onChange={e => setForm({ ...form, uom_id: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm appearance-none">
                        <option value="">-- Satuan --</option>
                        {uoms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 px-6 py-5 border-t border-gray-100 bg-white">
                <button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-blue-700">Batal</button>
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"><Save size={18} /> {loading ? 'Menyimpan...' : 'Simpan Produk'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}