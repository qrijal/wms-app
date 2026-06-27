'use client'
import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'

interface DetailItem {
    id: number
    product_id: number
    product_code: string
    qty: number
    qty_picked: number
    picking_details?: {
        id: number
        location_id: number
        qty_picked: number
        is_damage: boolean
        inbound_header_id?: number
        dim_location?: { name: string; barcode: string }
    }[]
    dim_products?: { name: string; uom?: { name: string; conversion_factor: number } | null }
}

interface StockOption {
    id: number
    location_id: number
    location_name: string
    location_barcode: string
    qty: number
    hold_qty: number
    is_damage: boolean
    inbound_header_id: number | null
}

interface CacheItem {
    detailId: number
    product_code: string
    product_name: string
    location_id: number
    location_name: string
    location_barcode: string
    qty: number
    is_damage: boolean
    inbound_header_id?: number | null
}

interface PickingTabProps {
    details: DetailItem[]
    warehouseId: number
    headerId: number
    headerStatus: string
    onRefresh: () => Promise<void>
}

export default function PickingTab({
    details: initialDetails,
    warehouseId,
    headerId,
    headerStatus,
    onRefresh,
}: PickingTabProps) {
    const [details, setDetails] = useState<DetailItem[]>(initialDetails)
    const [selectedDetail, setSelectedDetail] = useState<DetailItem | null>(null)
    const [step, setStep] = useState<'select' | 'choose_stock' | 'qty' | 'review'>('select')
    const [stockOptions, setStockOptions] = useState<StockOption[]>([])
    const [selectedStock, setSelectedStock] = useState<StockOption | null>(null)
    const [pickedQty, setPickedQty] = useState<string>('1')
    const [cacheItems, setCacheItems] = useState<CacheItem[]>([])
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [showReview, setShowReview] = useState(false)

    useEffect(() => {
        setDetails(initialDetails)
    }, [initialDetails])

    const getRemaining = (detail: DetailItem) =>
        detail.qty -
        (detail.qty_picked || 0) -
        cacheItems.filter(ci => ci.detailId === detail.id).reduce((s, ci) => s + ci.qty, 0)

    const fetchStockOptions = async (productId: number) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/inventory?product_id=${productId}&warehouse_id=${warehouseId}`)
            if (res.ok) {
                const json = await res.json()
                let stocks = (json.data || []).map((item: any) => ({
                    id: item.id,
                    location_id: item.location_id,
                    location_name: item.location_name,
                    location_barcode: item.location_barcode,
                    qty: item.qty,
                    hold_qty: item.hold_qty || 0,
                    is_damage: item.damage === true,
                    inbound_header_id: item.inbound_header_id ?? null,
                }))

                // Kurangi stok yang sudah dialokasikan di cache (belum dikonfirmasi)
                stocks = stocks.map(stock => {
                    const cachedQty = cacheItems
                        .filter(ci => ci.location_id === stock.location_id)
                        .reduce((sum, ci) => sum + ci.qty, 0)
                    return {
                        ...stock,
                        qty: stock.qty - cachedQty, // stok efektif yang bisa dipilih
                    }
                })

                setStockOptions(stocks)
            } else {
                setStockOptions([])
            }
        } catch {
            setStockOptions([])
        } finally {
            setLoading(false)
        }
    }
    const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        // Izinkan kosong atau hanya angka
        if (val === '' || /^[0-9]*$/.test(val)) {
            setPickedQty(val)
        }
    }
    const selectDetail = async (detail: DetailItem) => {
        const remaining = getRemaining(detail)
        if (remaining <= 0) return
        setSelectedDetail(detail)
        setSelectedStock(null)
        setPickedQty('1')
        await fetchStockOptions(detail.product_id)
        setStep('choose_stock')
    }

    const handleChooseStock = (stock: StockOption) => {
        if (stock.is_damage) {
            if (!confirm('Stok ini berstatus Rusak. Apakah Anda yakin ingin mengambil stok rusak?')) {
                return
            }
        }
        setSelectedStock(stock)
        setStep('qty')
    }

    const addToCache = () => {
        if (!selectedDetail || !selectedStock) return

        const qtyNum = parseInt(pickedQty, 10)
        if (isNaN(qtyNum) || qtyNum <= 0) {
            setError('Qty harus > 0')
            return
        }

        const remaining = getRemaining(selectedDetail)
        const available = selectedStock.qty - (selectedStock.hold_qty || 0)

        if (qtyNum > available) {
            setError(`Stok di lokasi ini hanya tersedia ${available}`)
            return
        }
        if (qtyNum > remaining) {
            setError(`Maksimal ${remaining} sesuai pesanan`)
            return
        }

        setCacheItems(prev => [
            ...prev,
            {
                detailId: selectedDetail.id,
                product_code: selectedDetail.product_code,
                product_name: selectedDetail.dim_products?.name || selectedDetail.product_code,
                location_id: selectedStock.location_id,
                location_name: selectedStock.location_name,
                location_barcode: selectedStock.location_barcode || '',
                qty: qtyNum,
                is_damage: selectedStock.is_damage,
                inbound_header_id: selectedStock.inbound_header_id,
            },
        ])

        setSuccess(`Ditambahkan: ${qtyNum} unit → ${selectedStock.location_name}`)
        setSelectedDetail(null)
        setSelectedStock(null)
        setStep('select')
        setPickedQty('1')
        setStockOptions([])
    }

    const removeCacheItem = (index: number) => {
        setCacheItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleFinalConfirm = async () => {
        setLoading(true)
        setError('')
        try {
            for (const item of cacheItems) {
                const res = await fetch('/api/outbound/picking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        detail_id: item.detailId,
                        location_id: item.location_id,
                        qty_picked: item.qty,
                        is_damage: item.is_damage,
                        inbound_header_id: item.inbound_header_id,
                    }),
                })
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || `Gagal picking ${item.product_code}`)
                }
            }

            setCacheItems([])
            setShowReview(false)
            setSuccess('Semua picking berhasil!')
            await onRefresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (headerStatus === 'DISPATCHED') {
        return <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold text-center">✅ Pengiriman sudah selesai.</div>
    }

    if (headerStatus !== 'DRAFT' && headerStatus !== 'PICKING') {
        return <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 font-semibold text-center">⚠️ Status tidak memungkinkan untuk picking.</div>
    }

    return (
        <div className="space-y-6">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            {/* Step 1: Pilih Item */}
            {step === 'select' && (
                <div>
                    <h3 className="font-semibold text-lg mb-3">Pilih Item untuk Picking</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {details.map(detail => {
                            const remaining = getRemaining(detail)
                            if (remaining <= 0) return null
                            return (
                                <div
                                    key={detail.id}
                                    onClick={() => selectDetail(detail)}
                                    className="cursor-pointer bg-white p-4 rounded-xl shadow border border-gray-200 hover:border-blue-400 transition-colors"
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-mono text-gray-400">{detail.product_code?.toLowerCase()}</span>
                                        <span className="font-medium">{detail.dim_products?.name}</span>
                                        <span className="text-sm">Pesanan: {detail.qty}</span>
                                        <span className="text-sm">Sudah dipicking: {detail.qty_picked || 0}</span>
                                        <span className="text-sm font-semibold text-blue-600">Sisa: {remaining}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Step 2: Pilih Stok (Rekomendasi) */}
            {step === 'choose_stock' && selectedDetail && (
                <div className="bg-white p-6 rounded-xl shadow border space-y-3">
                    <h3 className="font-bold text-lg">Pilih Stok untuk {selectedDetail.dim_products?.name}</h3>
                    <p>Sisa pesanan: {getRemaining(selectedDetail)}</p>
                    {loading ? (
                        <p className="text-sm text-gray-500">Memuat stok...</p>
                    ) : stockOptions.length === 0 ? (
                        <p className="text-sm text-gray-500">Tidak ada stok tersedia untuk produk ini.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {stockOptions.map(stock => (
                                <div
                                    key={stock.id}
                                    onClick={() => handleChooseStock(stock)}
                                    className={`cursor-pointer p-3 border rounded ${stock.is_damage ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-blue-300'}`}
                                >
                                    <p className="font-medium">{stock.location_name} ({stock.location_barcode})</p>
                                    <p>Stok: {stock.qty} {stock.hold_qty > 0 ? `(hold: ${stock.hold_qty})` : ''}</p>
                                    <p>Status: {stock.is_damage ? '⚠️ Rusak' : 'Normal'}</p>
                                    <p className="text-xs text-gray-500">Inbound: {stock.inbound_header_id ?? '-'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button variant="secondary" onClick={() => { setSelectedDetail(null); setStep('select'); setStockOptions([]) }}>Batal</Button>
                </div>
            )}

            {/* Step 3: Input Qty */}
            {step === 'qty' && selectedDetail && selectedStock && (
                <div className="bg-white p-6 rounded-xl shadow border space-y-3">
                    <h3 className="font-bold text-lg">Jumlah Picking</h3>
                    <p>Produk: {selectedDetail.dim_products?.name} ({selectedDetail.product_code})</p>
                    <p>Lokasi: {selectedStock.location_name} ({selectedStock.location_barcode})</p>
                    <p>Stok tersedia: {selectedStock.qty} {selectedStock.hold_qty > 0 ? `(hold: ${selectedStock.hold_qty})` : ''}</p>
                    <p>Sisa pesanan: {getRemaining(selectedDetail)}</p>
                    <p className={selectedStock.is_damage ? 'text-red-600 font-semibold' : ''}>
                        Status: {selectedStock.is_damage ? '⚠️ Rusak' : 'Normal'}
                    </p>
                    <Input
                        label="Qty"
                        type="text"            // ganti dari number ke text
                        value={pickedQty}
                        onChange={handleQtyChange}
                        placeholder="1"
                        inputMode="numeric"    // agar keyboard mobile menampilkan angka
                    />
                    <div className="flex gap-3">
                        <Button onClick={addToCache}>Tambahkan</Button>
                        <Button variant="secondary" onClick={() => { setSelectedStock(null); setStep('choose_stock') }}>Kembali</Button>
                    </div>
                </div>
            )}

            {/* Tombol Review Cache */}
            {cacheItems.length > 0 && (
                <div className="flex justify-end">
                    <Button onClick={() => setShowReview(true)}>Review & Konfirmasi ({cacheItems.length})</Button>
                </div>
            )}

            {/* Daftar item yang sudah dipilih (cache) */}
            <div>
                <h3 className="font-semibold text-lg mb-3">Item dalam Cache</h3>
                <div className="space-y-2">
                    {cacheItems.map((item, idx) => (
                        <div key={idx} className="p-3 border rounded flex justify-between">
                            <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-xs text-gray-500">{item.product_code} → {item.location_name}</p>
                                {item.is_damage && <span className="text-xs text-red-500">Damage</span>}
                                {item.inbound_header_id && <span className="text-xs text-gray-400">Inbound: {item.inbound_header_id}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span>{item.qty}</span>
                                <button onClick={() => removeCacheItem(idx)} className="text-red-500 text-xs">Hapus</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Review */}
            {showReview && (
                <Modal onClose={() => setShowReview(false)} title="Konfirmasi Picking">
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {cacheItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.product_name}</p>
                                    <p className="text-xs text-gray-400 font-mono">{item.product_code}</p>
                                    <p className="text-xs text-blue-600">Lokasi: {item.location_name}</p>
                                    {item.is_damage && <p className="text-xs text-red-500">⚠ Damage</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span>{item.qty}</span>
                                    <button onClick={() => removeCacheItem(idx)} className="text-red-500 hover:text-red-700 text-xs">Hapus</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="secondary" onClick={() => setShowReview(false)}>Tutup</Button>
                        <Button onClick={handleFinalConfirm} disabled={loading || cacheItems.length === 0}>
                            {loading ? 'Menyimpan...' : 'Konfirmasi Semua'}
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    )
}