'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import { createClient } from '@/lib/supabase/client'
import { CloudUpload, Download, Info, Eye, FileText, CheckCircle2, ArrowDownToLine } from 'lucide-react'

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
          companyName: wh.dim_branch?.[0]?.dim_company?.[0]?.name || '',
          branchName: wh.dim_branch?.[0]?.name || '',
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Buat Inbound Baru</h1>
        <p className="text-sm text-slate-500 mt-1">Unggah file CSV untuk memproses data inbound secara massal.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Card Upload */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Upload File CSV</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Download size={16} /> Download Template
          </button>
        </div>

        {/* Dropzone Area */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-8 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {!file ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <CloudUpload size={24} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">Pilih file CSV atau tarik ke sini</p>
                <p className="text-xs text-slate-500 mt-0.5">Maksimal ukuran file 10MB</p>
              </div>
              <Button
                variant="secondary"
                className="ml-4 bg-white"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse File
              </Button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="flex items-center gap-3 bg-white px-4 py-3 border border-slate-200 rounded-lg shadow-sm w-full max-w-md">
                <FileText className="text-blue-600" size={24} />
                <div className="flex-1 text-left truncate">
                  <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  Hapus
                </button>
              </div>

              <div className="w-full max-w-md text-left space-y-3">
                <Input
                  label="Catatan Opsional"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan catatan untuk Inbound ini..."
                />
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full justify-center flex gap-2"
                >
                  {loading ? 'Mengupload...' : <><CloudUpload size={18} /> Proses Inbound</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Format Kolom Wajib:</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {['surat_jalan', 'company_name', 'branch_name', 'wh_name', 'product_code', 'qty'].map(col => (
                <span key={col} className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-mono shadow-sm">
                  {col}
                </span>
              ))}
            </div>
            <p className="text-xs text-blue-800/80">Pastikan baris pertama pada file CSV Anda adalah header dengan nama kolom yang tepat seperti di atas.</p>
          </div>
        </div>
      </div>

      {/* History Card (Mockup UI sesuai referensi gambar) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Riwayat Unggahan</h2>
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Lihat Semua
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">NAMA FILE</th>
                <th className="px-6 py-4">TANGGAL</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {/* Mock Data 1 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">inbound_batch_01.csv</td>
                <td className="px-6 py-4 text-slate-500">15 Okt 2023, 14:20</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Berhasil
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <Eye size={18} className="mx-auto" />
                  </button>
                </td>
              </tr>
              {/* Mock Data 2 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">inbound_batch_02.csv</td>
                <td className="px-6 py-4 text-slate-500">16 Okt 2023, 09:15</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Proses
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowDownToLine size={18} className="mx-auto" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}