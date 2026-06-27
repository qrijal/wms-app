'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'

export default function AddBrandButton({ role, companies }: { role: string; companies: any[] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', company_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const companyOptions = companies.map((c: any) => ({ value: String(c.id), label: c.name }))

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) { setError('Nama brand harus diisi'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setOpen(false)
      setForm({ name: '', company_id: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah Brand</Button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Tambah Brand">
          {error && <Alert type="error" message={error} />}
          {role === 'superadmin' && (
            <Select
              label="Company"
              value={form.company_id}
              onChange={e => setForm({ ...form, company_id: e.target.value })}
              options={[{ value: '', label: 'Global (Tanpa Company)' }, ...companyOptions]}
            />
          )}
          <Input label="Nama Brand" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </Modal>
      )}
    </>
  )
}