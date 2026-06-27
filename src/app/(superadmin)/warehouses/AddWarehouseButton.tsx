'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'

export default function AddWarehouseButton() {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({
        name: '',
        company_id: '',
        branch_id: '',
        location: '',
    })
    const [companies, setCompanies] = useState<any[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // Ambil daftar company saat modal dibuka
    useEffect(() => {
        if (open) {
            fetchCompanies()
        }
    }, [open])

    // Ambil branch saat company_id berubah
    useEffect(() => {
        if (form.company_id) {
            fetchBranches(form.company_id)
        } else {
            setBranches([])
            setForm(prev => ({ ...prev, branch_id: '' }))
        }
    }, [form.company_id])

    const fetchCompanies = async () => {
        try {
            const res = await fetch('/api/companies')
            if (res.ok) {
                const data = await res.json()
                setCompanies(data)
            }
        } catch (err) {
            console.error('Gagal mengambil company:', err)
        }
    }

    const fetchBranches = async (companyId: string) => {
        try {
            const res = await fetch(`/api/branches?company_id=${companyId}`)
            if (res.ok) {
                const data = await res.json()
                setBranches(data)
            }
        } catch (err) {
            console.error('Gagal mengambil branch:', err)
        }
    }

    const handleSubmit = async () => {
        setError('')
        if (!form.name.trim() || !form.branch_id) {
            setError('Nama gudang dan branch harus diisi')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/warehouses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    branch_id: form.branch_id,
                    location: form.location,
                }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Gagal menambah warehouse')
            }
            setOpen(false)
            setForm({ name: '', company_id: '', branch_id: '', location: '' })
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const companyOptions = companies.map(c => ({ value: String(c.id), label: c.name }))
    const branchOptions = branches.map(b => ({ value: String(b.id), label: b.name }))

    return (
        <>
            <Button onClick={() => setOpen(true)}>Tambah Warehouse</Button>
            {open && (
                <Modal onClose={() => setOpen(false)} title="Tambah Warehouse">
                    {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                    <Select
                        label="Company"
                        value={form.company_id}
                        onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                        options={[{ value: '', label: '-- Pilih Company --' }, ...companyOptions]}
                    />
                    <Select
                        label="Branch"
                        value={form.branch_id}
                        onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                        options={[{ value: '', label: '-- Pilih Branch --' }, ...branchOptions]}
                        disabled={!form.company_id}
                    />
                    <Input
                        label="Nama Gudang"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Nama gudang"
                    />
                    <Input
                        label="Lokasi (opsional)"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="Alamat atau keterangan"
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