'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ScanQRInput from '@/components/ScanQRInput'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

export default function NewTransfer() {
  const [step, setStep] = useState<'product' | 'from_location' | 'to_location' | 'qty' | 'confirm'>('product')
  const [product, setProduct] = useState<any>(null)
  const [fromLocation, setFromLocation] = useState<any>(null)
  const [toLocation, setToLocation] = useState<any>(null)
  const [qty, setQty] = useState<number>(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleProductScan = async (code: string) => {
    setError('')
    try {
      const res = await fetch(`/api/products?code=${encodeURIComponent(code)}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Produk tidak ditemukan' }))
        throw new Error(errData.error || 'Produk tidak ditemukan')
      }
      const data = await res.json()
      if (!data || !data.id) {
        throw new Error('Data produk tidak valid')
      }
      setProduct(data)
      setStep('from_location')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleFromLocationScan = async (barcode: string) => {
    setError('')
    try {
      const res = await fetch(`/api/locations/by-barcode?barcode=${encodeURIComponent(barcode)}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Lokasi tidak valid' }))
        throw new Error(errData.error || 'Lokasi tidak ditemukan')
      }
      const loc = await res.json()
      setFromLocation(loc)
      setStep('to_location')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleToLocationScan = async (barcode: string) => {
    setError('')
    if (barcode === fromLocation?.barcode) { setError('Lokasi tujuan harus berbeda'); return }
    try {
      const res = await fetch(`/api/locations/by-barcode?barcode=${encodeURIComponent(barcode)}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Lokasi tidak valid' }))
        throw new Error(errData.error || 'Lokasi tidak ditemukan')
      }
      const loc = await res.json()
      setToLocation(loc)
      setStep('qty')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!product || !product.id) { setError('Produk tidak valid'); return }
    if (!fromLocation || !fromLocation.id) { setError('Lokasi asal tidak valid'); return }
    if (!toLocation || !toLocation.id) { setError('Lokasi tujuan tidak valid'); return }
    if (qty <= 0) { setError('Qty harus lebih dari 0'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/transfer/header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            product_id: product.id,
            product_code: product.product_code,
            from_location_id: fromLocation.id,
            to_location_id: toLocation.id,
            qty
          }]
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan transfer')
      }
      router.push('/operator/transfer')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Transfer Stock Baru</h1>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {step === 'product' && (
        <ScanQRInput onScan={handleProductScan} placeholder="Scan product_code..." />
      )}

      {step === 'from_location' && product && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-3">
          <h3 className="font-bold text-lg">Lokasi Asal</h3>
          <p><span className="font-medium">Produk:</span> {product.name} ({product.product_code})</p>
          <ScanQRInput onScan={handleFromLocationScan} placeholder="Scan barcode lokasi asal..." />
          <Button variant="secondary" onClick={() => setStep('product')}>Batal</Button>
        </div>
      )}

      {step === 'to_location' && fromLocation && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-3">
          <h3 className="font-bold text-lg">Lokasi Tujuan</h3>
          <p><span className="font-medium">Dari:</span> {fromLocation.name} ({fromLocation.barcode})</p>
          <ScanQRInput onScan={handleToLocationScan} placeholder="Scan barcode lokasi tujuan..." />
          <Button variant="secondary" onClick={() => setStep('from_location')}>Batal</Button>
        </div>
      )}

      {step === 'qty' && toLocation && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-3">
          <h3 className="font-bold text-lg">Jumlah Transfer</h3>
          <p><span className="font-medium">Produk:</span> {product.name}</p>
          <p><span className="font-medium">Dari:</span> {fromLocation.name} → <span className="font-medium">Ke:</span> {toLocation.name}</p>
          <Input
            label="Qty"
            type="number"
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            min={1}
          />
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Konfirmasi Transfer'}
            </Button>
            <Button variant="secondary" onClick={() => setStep('to_location')}>Batal</Button>
          </div>
        </div>
      )}
    </div>
  )
}