// src/app/(superadmin)/users/EditUserModal.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Mail, User, Shield, Warehouse, Save, ChevronDown } from 'lucide-react'

interface EditUserModalProps {
  user: any
  warehouses: any[]
  onClose: () => void
}

export default function EditUserModal({ user, warehouses, onClose }: EditUserModalProps) {
  if (!user) return null

  const [form, setForm] = useState({
    wh_id: user.wh_id || '',
    full_name: user.full_name || '',
    role: user.role || 'admin',
  })
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!form.wh_id) { setError('Pilih warehouse'); return }
    if (!form.full_name.trim()) { setError('Nama harus diisi'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wh_id: form.wh_id,
          full_name: form.full_name,
          role: form.role,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal memperbarui user')
      }
      
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-slate-800">Edit Data Pengguna</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-5">
            
            {/* Alert Error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* Email Field (Readonly) */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Email <span className="font-normal text-slate-400 text-xs ml-1">(Tidak bisa diubah)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={user.email || ''} 
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-lg text-slate-500 text-sm focus:outline-none cursor-not-allowed" 
                />
              </div>
            </div>

            {/* Nama Lengkap Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  value={form.full_name} 
                  onChange={e => setForm({ ...form, full_name: e.target.value })} 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Role Select */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Role
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
              </div>
            </div>

            {/* Warehouse Select */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Warehouse
              </label>
              <div className="relative">
                <Warehouse className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <select
                  value={form.wh_id}
                  onChange={e => setForm({ ...form, wh_id: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Warehouse --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
              </div>
            </div>

          </div>

          {/* Footer Aksi */}
          <div className="flex items-center justify-end gap-6 px-6 py-5 border-t border-gray-100 bg-white">
            <button 
              type="button" 
              onClick={onClose}
              className="text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}