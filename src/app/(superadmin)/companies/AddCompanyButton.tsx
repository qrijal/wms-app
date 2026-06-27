'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

export default function AddCompanyButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) {
      setError('Nama perusahaan harus diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menambah company')
      }
      setOpen(false)
      setName('')
      router.refresh() // Refresh data halaman
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button className="flex items-center" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Data
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Add">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          <Input
            label="Nama Perusahaan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama perusahaan"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}