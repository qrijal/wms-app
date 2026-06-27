'use client'
import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

interface DispatchTabProps {
  headerId: number
  currentStatus: string
  nopol?: string | null
  namaDriver?: string | null
  onRefresh: () => Promise<void>
}

export default function DispatchTab({
  headerId,
  currentStatus,
  nopol: initialNopol,
  namaDriver: initialDriver,
  onRefresh,
}: DispatchTabProps) {
  const [nopol, setNopol] = useState(initialNopol || '')
  const [namaDriver, setNamaDriver] = useState(initialDriver || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setNopol(initialNopol || '')
    setNamaDriver(initialDriver || '')
  }, [initialNopol, initialDriver])

  const handleDispatch = async () => {
    if (!nopol.trim()) {
      setError('No. Polisi harus diisi')
      return
    }
    if (!namaDriver.trim()) {
      setError('Nama Driver harus diisi')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/outbound/header/${headerId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nopol: nopol.trim(), nama_driver: namaDriver.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal dispatch')
      }
      setSuccess('Pengiriman berhasil dikonfirmasi!')
      onRefresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus === 'DISPATCHED') {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center">
        ✅ Pengiriman sudah selesai (DISPATCHED).
        {nopol && <p className="mt-2 text-sm">No. Polisi: {nopol}</p>}
        {namaDriver && <p className="text-sm">Driver: {namaDriver}</p>}
      </div>
    )
  }

  if (currentStatus !== 'PICKING') {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 font-semibold text-center">
        ⚠️ Proses picking belum selesai. Silakan selesaikan picking terlebih dahulu.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Konfirmasi Pengiriman</h3>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} />}

      <Input
        label="No. Polisi (Nopol)"
        placeholder="Masukkan nomor polisi"
        value={nopol}
        onChange={e => setNopol(e.target.value)}
        required
      />
      <Input
        label="Nama Driver"
        placeholder="Masukkan nama driver"
        value={namaDriver}
        onChange={e => setNamaDriver(e.target.value)}
        required
      />

      <div className="flex justify-end">
        <Button onClick={handleDispatch} disabled={loading}>
          {loading ? 'Mengirim...' : 'Konfirmasi Pengiriman (Dispatch)'}
        </Button>
      </div>
    </div>
  )
}