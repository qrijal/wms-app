'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import { createClient } from '@/lib/supabase/client'

export default function CreateInboundPage() {
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [warehouseInfo, setWarehouseInfo] = useState<{
    companyName: string
    branchName: string
    whName: string
  } | null>(null)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Ambil informasi warehouse user saat ini
  useEffect(() => {
    const fetchWarehouseInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('dim_users')
        .select('wh_id')
        .eq('id', user.id)
        .single()

      if (!profile?.wh_id) return

      const { data: wh } = await supabase
        .from('dim_warehouses')
        .select('name, dim_branch(name, dim_company(name))')
        .eq('id', profile.wh_id)
        .single()

      if (wh) {
        setWarehouseInfo({
          companyName: wh.dim_branch?.dim_company?.name || '',
          branchName: wh.dim_branch?.name || '',
          whName: wh.name,
        })
      }
    }
    fetchWarehouseInfo()
  }, [supabase])

  const downloadTemplate = () => {
    if (!warehouseInfo) {
      setError('Data warehouse belum tersedia. Mohon tunggu sebentar.')
      return
    }
    const header = 'company_name,branch_name,wh_name,surat_jalan,inbound_date,product_code,qty\n'
    const exampleRow = [
      warehouseInfo.companyName,
      warehouseInfo.branchName,
      warehouseInfo.whName
    ].join(',') + '\n'

    const csvContent = header + exampleRow
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_inbound.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.name.endsWith('.csv')) {
      setFile(selected)
      setError('')
    } else {
      setFile(null)
      setError('Hanya file CSV yang diizinkan')
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!file) {
      setError('Pilih file CSV terlebih dahulu')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('notes', notes)

      const res = await fetch('/api/inbound/upload-csv', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal membuat inbound')
      }
      router.push('/inbound')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Buat Inbound Baru (Upload CSV)</h1>
      {error && <Alert type="error" message={error} />}

      <Input
        label="Catatan (opsional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">File CSV</label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm border rounded p-2"
          />
          <Button variant="secondary" onClick={downloadTemplate}>
            Template
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Kolom: <strong>surat_jalan, company_name, branch_name, wh_name, product_code, qty</strong>.
          Baris pertama adalah header.
        </p>
      </div>

      <div className="mt-6">
        <Button onClick={handleSubmit} disabled={loading || !file}>
          {loading ? 'Mengupload...' : 'Buat Inbound'}
        </Button>
      </div>
    </div>
  )
}