'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'

interface AddProductButtonProps {
  role: string
  warehouseId: number | null
  brands: any[]
  uoms: any[]       // hanya secondary, punya .base.name
  branches: any[]
}

export default function AddProductButton({
  role,
  warehouseId,
  brands,
  uoms,
  branches,
}: AddProductButtonProps): import("react/jsx-runtime").JSX.Element {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    product_code: '',
    brand_id: '',
    uom_id: '',
    branch_id: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const brandOptions = [
    { value: '', label: '-- Tanpa Brand --' },
    ...brands.map((b: any) => ({ value: String(b.id), label: b.name })),
  ]

  // Buat opsi UOM dengan format "BOX -> LEMBAR"
  const uomOptions = [
    { value: '', label: '-- Pilih Satuan --' },
    ...uoms.map((u: any) => ({
      value: String(u.id),
      label: `${u.name} (${u.conversion_factor} ${u.base?.name || 'Primary'})`,
    })),
  ]

  const branchOptions = [
    { value: '', label: '-- Pilih Branch --' },
    ...branches.map((b: any) => ({ value: String(b.id), label: b.name })),
  ]

  const handleSubmit = async () => {
    setError('')

    if (!form.name.trim()) {
      setError('Nama produk harus diisi')
      return
    }
    if (!form.product_code.trim()) {
      setError('Barcode harus diisi')
      return
    }
    if (role === 'superadmin' && !form.branch_id) {
      setError('Branch harus dipilih')
      return
    }
    if (!form.uom_id) {
      setError('UOM harus dipilih (wajib secondary)')
      return
    }

    setLoading(true)
    try {
      const body: any = {
        name: form.name,
        product_code: form.product_code,
        brand_id: form.brand_id || null,
        uom_id: form.uom_id,
      }
      if (role === 'superadmin') {
        body.branch_id = form.branch_id
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menambah produk')
      }

      setOpen(false)
      setForm({ name: '', product_code: '', brand_id: '', uom_id: '', branch_id: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah Produk</Button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Tambah Produk">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {role === 'superadmin' && (
            <Select
              label="Branch"
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              options={branchOptions}
            />
          )}

          <Input
            label="Nama Produk"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama produk"
          />
          <Input
            label="Barcode"
            value={form.product_code}
            onChange={(e) => setForm({ ...form, product_code: e.target.value })}
            placeholder="Kode product_code"
          />

          <Select
            label="Brand"
            value={form.brand_id}
            onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
            options={brandOptions}
          />

          <Select
            label="UOM (Satuan Jual)"
            value={form.uom_id}
            onChange={(e) => setForm({ ...form, uom_id: e.target.value })}
            options={uomOptions}
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