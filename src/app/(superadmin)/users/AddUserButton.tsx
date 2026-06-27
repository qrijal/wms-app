'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'

export default function AddUserButton({ warehouses }: { warehouses: any[] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    wh_id: '',
    full_name: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'admin',   // default tetap admin
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const warehouseOptions = [
    { value: '', label: '-- Pilih Warehouse --' },
    ...warehouses.map(w => ({ value: String(w.id), label: w.name })),
  ]

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'operator', label: 'Operator' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.wh_id) { setError('Pilih warehouse'); return }
    if (!form.full_name.trim()) { setError('Nama harus diisi'); return }
    if (!form.email.trim()) { setError('Email harus diisi'); return }
    if (!form.password) { setError('Password harus diisi'); return }
    if (form.password.length < 8) { setError('Password minimal 8 karakter'); return }
    if (form.password !== form.password_confirm) { setError('Konfirmasi password tidak cocok'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wh_id: form.wh_id,
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,        // kirim role yang dipilih
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal membuat user')
      }
      setOpen(false)
      setForm({ wh_id: '', full_name: '', email: '', password: '', password_confirm: '', role: 'admin' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah User</Button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Tambah User Baru">
          <form onSubmit={handleSubmit}>
            {error && <Alert type="error" message={error} />}

            <Select
              label="Role"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              options={roleOptions}
            />

            <Select
              label="Warehouse"
              value={form.wh_id}
              onChange={e => setForm({ ...form, wh_id: e.target.value })}
              options={warehouseOptions}
            />

            <Input label="Nama Lengkap" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <Input label="Konfirmasi Password" type="password" value={form.password_confirm} onChange={e => setForm({ ...form, password_confirm: e.target.value })} />

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}