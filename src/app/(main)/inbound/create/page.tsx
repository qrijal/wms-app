'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
// HAPUS IMPORT ALERT
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CloudUpload, Download, Info, Eye, FileText, ArrowDownToLine } from 'lucide-react'
import toast from 'react-hot-toast' // <-- 1. IMPORT TOAST DI SINI

interface UploadLog {
  id: string
  file_name: string
  created_at: string
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED'
}

export default function CreateInboundPage() {
  const [file, setFile] = useState<File | null>(null)
  // const [error, setError] = useState('') <-- 2. HAPUS STATE ERROR INI
  const [loading, setLoading] = useState(false)
  const [warehouseInfo, setWarehouseInfo] = useState<{
    companyName: string
    branchName: string
    whName: string
  } | null>(null)

  const [logs, setLogs] = useState<UploadLog[]>([
    { id: '1', file_name: 'inbound_batch_01.csv', created_at: '2023-10-15T14:20:00Z', status: 'SUCCESS' },
    { id: '2', file_name: 'inbound_batch_02.csv', created_at: '2023-10-16T09:15:00Z', status: 'PROCESSING' }
  ])

  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

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

      const { data: warehouse } = await supabase
        .from('dim_warehouses')
        .select('id, name, branch_id')
        .eq('id', profile.wh_id)
        .single()

      if (!warehouse?.branch_id) return

      const { data: branch } = await supabase
        .from('dim_branch')
        .select('name, company_id')
        .eq('id', warehouse.branch_id)
        .single()

      const { data: company } = await supabase
        .from('dim_company')
        .select('name')
        .eq('id', branch?.company_id)
        .single()

      setWarehouseInfo({
        companyName: company?.name || '',
        branchName: branch?.name || '',
        whName: warehouse.name || '',
      })
    }

    fetchWarehouseInfo()
  }, [supabase])

  const downloadTemplate = () => {
    if (!warehouseInfo) {
      toast.error('Data warehouse belum tersedia. Mohon tunggu sebentar.') // <-- 3. GANTI JADI TOAST
      return
    }
    const header = 'company_name,branch_name,wh_name,surat_jalan,inbound_date,product_code,qty,batch_number,expired_date\n'
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
    } else {
      setFile(null)
      toast.error('Hanya file CSV yang diizinkan') // <-- 4. GANTI JADI TOAST
    }
  }

  const validateCSV = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return reject(new Error('File CSV kosong.'));

        // Pisahkan teks berdasarkan baris baru (hilangkan baris yang benar-benar kosong)
        const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
        
        if (rows.length <= 1) {
          return reject(new Error('File CSV tidak memiliki data (hanya berisi header atau kosong).'));
        }

        // Ambil header di baris pertama
        const headers = rows[0].split(',').map(h => h.trim());
        
        // Kolom yang wajib diisi (sesuai kebutuhan Anda)
        const REQUIRED_COLUMNS = [
          'company_name', 'branch_name', 'wh_name', 'surat_jalan', 
          'inbound_date', 'product_code', 'qty', 'batch_number', 'expired_date'
        ];

        // A. Cek apakah header memiliki semua kolom wajib
        for (const col of REQUIRED_COLUMNS) {
          if (!headers.includes(col)) {
            return reject(new Error(`Validasi Gagal: Kolom '${col}' tidak ditemukan di baris header CSV.`));
          }
        }

        // Dapatkan letak index masing-masing kolom wajib
        const colIndices = REQUIRED_COLUMNS.map(col => headers.indexOf(col));

        // B. Cek kelengkapan data di setiap baris (mulai dari index 1 karena index 0 adalah header)
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].split(',');
          
          for (let j = 0; j < REQUIRED_COLUMNS.length; j++) {
            const cellValue = cells[colIndices[j]]?.trim();
            
            // Jika datanya undefined, null, atau string kosong
            if (!cellValue || cellValue === '') {
              // Note: Karena i dimulai dari 1 (baris pertama data), kita jadikan i sebagai indikator baris keberapa di data aktual
              return reject(new Error(`Upload Gagal: Data Tidak Lengkap`));
            }
          }
        }
        
        resolve(true); // Lolos validasi
      };

      reader.onerror = () => reject(new Error('Gagal membaca file CSV.'));
      reader.readAsText(file);
    });
  }
  

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Pilih file CSV terlebih dahulu')
      return
    }
    
    const loadingToast = toast.loading('Memvalidasi dan mengupload CSV...')
    setLoading(true)
    
    try {
      // 2. PANGGIL FUNGSI VALIDASI DI SINI SEBELUM PROSES API
      await validateCSV(file);

      // Jika lolos validasi, kode di bawah ini akan tereksekusi
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/inbound/upload-csv', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal membuat inbound')
      }
      
      toast.success('File CSV berhasil diproses!', { id: loadingToast })
      router.push('/inbound')
      
    } catch (err: any) {
      // Jika validasi gagal, error-nya (termasuk baris keberapa yang kosong) akan muncul di toast merah ini
      toast.error(err.message, { id: loadingToast, duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className='flex flex-row gap-4 items-center'>
        <button
          onClick={() => router.back()}
          className="p-3 border-2 border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Buat Inbound Baru</h1>
          <p className="text-sm text-slate-500 mt-1">Unggah file CSV untuk memproses data inbound secara massal.</p>
        </div>
      </div>

      {/* 6. HAPUS KOMPONEN <Alert /> DARI SINI */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Upload File CSV</h2>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                <Download size={14} /> Template
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-6 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 min-h-[200px]">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {!file ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <CloudUpload size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Pilih file CSV atau tarik ke sini</p>
                    <p className="text-xs text-slate-500 mt-0.5">Maksimal ukuran file 10MB</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="bg-white border-slate-300 shadow-sm text-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse File
                  </Button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="flex items-center gap-3 bg-white px-4 py-3 border border-slate-200 rounded-lg shadow-sm w-full">
                    <FileText className="text-blue-600 shrink-0" size={24} />
                    <div className="flex-1 text-left truncate overflow-hidden">
                      <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded"
                    >
                      Hapus
                    </button>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full justify-center flex gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                  >
                    {loading ? 'Mengupload...' : <><CloudUpload size={18} /> Proses Inbound</>}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-3">
            <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Format Kolom Wajib:</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {['surat_jalan', 'company_name', 'branch_name', 'wh_name', 'product_code', 'qty'].map(col => (
                  <span key={col} className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-mono shadow-sm">
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-800/80 leading-relaxed">Pastikan baris pertama pada file CSV Anda adalah header dengan nama kolom yang tepat. Unduh Template untuk referensi format yang benar.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-800">Riwayat Unggahan Inbound</h2>
              <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                Refresh
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">NAMA FILE</th>
                    <th className="px-6 py-4">WAKTU UPLOAD</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                        Belum ada riwayat unggahan CSV
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                          <FileText size={16} className="text-slate-400" />
                          {log.file_name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          {log.status === 'SUCCESS' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 border border-green-200 text-green-700">
                              Berhasil
                            </span>
                          )}
                          {log.status === 'PROCESSING' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700">
                              Proses
                            </span>
                          )}
                          {log.status === 'FAILED' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 border border-red-200 text-red-700">
                              Gagal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="text-slate-400 hover:text-blue-600 transition-colors p-2 bg-white rounded border border-slate-200 hover:border-blue-200 shadow-sm" title="Lihat Detail">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}