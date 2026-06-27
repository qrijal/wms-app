'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'

export default function AddUomPairButton({ role, companies }: { role: string; companies: any[] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    primary_name: '',
    secondary_name: '',
    conversion_factor: '',
    company_id: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const companyOptions = companies.map(c => ({ value: String(c.id), label: c.name }))

  const handleSubmit = async () => {
    setError('')
    if (!form.primary_name.trim() || !form.secondary_name.trim() || !form.conversion_factor) {
      setError('Semua field harus diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/uoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menambah konversi')
      }
      setOpen(false)
      setForm({ primary_name: '', secondary_name: '', conversion_factor: '', company_id: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah Konversi</Button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Tambah Konversi Satuan">
          {error && <Alert type="error" message={error} />}
          {role === 'superadmin' && (
            <Select
              label="Company"
              value={form.company_id}
              onChange={e => setForm({ ...form, company_id: e.target.value })}
              options={[{ value: '', label: 'Global' }, ...companyOptions]}
            />
          )}
          <Input
            label="Nama Primary UOM"
            placeholder="misal: Lembar"
            value={form.primary_name}
            onChange={e => setForm({ ...form, primary_name: e.target.value })}
          />
          <Input
            label="Nama Secondary UOM"
            placeholder="misal: Box"
            value={form.secondary_name}
            onChange={e => setForm({ ...form, secondary_name: e.target.value })}
          />
          <Input
            label="Faktor Konversi"
            type="number"
            step="any"
            placeholder="40 (artinya 1 Box = 40 Lembar)"
            value={form.conversion_factor}
            onChange={e => setForm({ ...form, conversion_factor: e.target.value })}
          />
          <p className="text-sm text-gray-500 mb-2">
            Contoh: 1 <strong>{form.secondary_name || 'Secondary'}</strong> = {form.conversion_factor || '?'} <strong>{form.primary_name || 'Primary'}</strong>
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}