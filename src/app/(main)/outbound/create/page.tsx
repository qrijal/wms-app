'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

export default function CreateOutboundPage() {
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const csvContent =
      'surat_jalan,company_name,branch_name,wh_name,product_code,qty,nopol,nama_driver\n' +
      'SJ-OUT-001,PT Contoh,Cabang Pusat,Gudang Utama,SKU001,10,B 1234 ABC,Supri\n' +
      'SJ-OUT-001,PT Contoh,Cabang Pusat,Gudang Utama,SKU002,20,B 1234 ABC,Supri'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_outbound.csv'
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

      const res = await fetch('/api/outbound/upload-csv', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal membuat outbound')
      }
      router.push('/outbound')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Buat Outbound Baru (Upload CSV)</h1>
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
          Opsional: nopol, nama_driver.
        </p>
      </div>

      <div className="mt-6">
        <Button onClick={handleSubmit} disabled={loading || !file}>
          {loading ? 'Mengupload...' : 'Buat Outbound'}
        </Button>
      </div>
    </div>
  )
}