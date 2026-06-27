'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'
import { Plus } from 'lucide-react'

export default function AddBranchButton({ companies }: { companies: any[] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', company_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim() || !form.company_id) {
      setError('Semua field harus diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menambah branch')
      }
      setOpen(false)
      setForm({ name: '', company_id: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const companyOptions = companies.map(c => ({ value: String(c.id), label: c.name }))

  return (
    <>
      <Button className="flex items-center" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Data
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Tambah Branch">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          <Select
            label="Company"
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
            options={[{ value: '', label: '-- Pilih Company --' }, ...companyOptions]}
          />
          <Input
            label="Nama Branch"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama cabang"
          />
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