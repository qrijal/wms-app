'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'

interface AddLocationButtonProps {
  role: string
  warehouseId: number | null
  warehouses: any[] // hanya untuk superadmin
}

export default function AddLocationButton({
  role,
  warehouseId,
  warehouses,
}: AddLocationButtonProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    barcode: '',
    warehouse_id: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const warehouseOptions = warehouses.map((w: any) => ({
    value: String(w.id),
    label: w.name,
  }))

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) {
      setError('Nama lokasi harus diisi')
      return
    }

    // Jika superadmin, pastikan warehouse_id dipilih
    if (role === 'superadmin' && !form.warehouse_id) {
      setError('Pilih warehouse')
      return
    }

    setLoading(true)
    try {
      const body: any = {
        name: form.name,
        barcode: form.barcode || null,
      }
      if (role === 'superadmin') {
        body.warehouse_id = form.warehouse_id
      }

      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menambah lokasi')
      }

      setOpen(false)
      setForm({ name: '', barcode: '', warehouse_id: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah Lokasi</Button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Tambah Lokasi">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {role === 'superadmin' && (
            <Select
              label="Warehouse"
              value={form.warehouse_id}
              onChange={e => setForm({ ...form, warehouse_id: e.target.value })}
              options={[
                { value: '', label: '-- Pilih Warehouse --' },
                ...warehouseOptions,
              ]}
            />
          )}

          <Input
            label="Nama Lokasi"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nama rak / area"
          />
          <Input
            label="Barcode (opsional)"
            value={form.barcode}
            onChange={e => setForm({ ...form, barcode: e.target.value })}
            placeholder="Kode barcode lokasi"
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