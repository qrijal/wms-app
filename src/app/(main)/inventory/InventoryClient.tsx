'use client'
import { useState, useEffect, useCallback } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'
import { useRouter, useSearchParams } from 'next/navigation'

interface InventoryItem {
  id: number
  product_name: string
  product_code: string
  uom_name: string
  location_name: string
  location_barcode: string
  warehouse_name: string
  warehouse_id: number
  product_id: number
  location_id: number
  qty: number
  damage: boolean
  inbound_header_id?: number | null
  updated_at: string
}

interface LocationOption {
  id: number
  name: string
  barcode?: string
}

interface InventoryClientProps {
  role: string
  warehouses: { id: number; name: string }[]
  userWhId?: number | null
}

const PAGE_SIZE = 20

export default function InventoryClient({ role, warehouses, userWhId }: InventoryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState({
    product_code: searchParams.get('product_code') || '',
    location: searchParams.get('location') || '',
    warehouse_id: searchParams.get('warehouse_id') || '',
  })
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [data, setData] = useState<InventoryItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Modal Update
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [toLocationInput, setToLocationInput] = useState('')
  const [suggestions, setSuggestions] = useState<LocationOption[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [transferQty, setTransferQty] = useState<number>(1)
  const [isDamage, setIsDamage] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.product_code) params.set('product_code', filters.product_code)
      if (filters.location) params.set('location', filters.location)
      if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id)
      params.set('page', String(currentPage))
      params.set('limit', String(PAGE_SIZE))

      const res = await fetch(`/api/inventory?${params.toString()}`)
      if (!res.ok) {
        let errorMsg = 'Gagal memuat data'
        try {
          const err = await res.json()
          errorMsg = err.error || errorMsg
        } catch { }
        throw new Error(errorMsg)
      }

      const json = await res.json()

      // Pastikan data adalah array
      if (!json || !Array.isArray(json.data)) {
        console.error('Format data inventory tidak valid:', json)
        setData([])
        setTotalCount(0)
        return
      }

      const normalizedData = json.data.map((item: any) => ({
        ...item,
        damage: item.damage ?? false,
        warehouse_id: item.warehouse_id ?? 0,
        product_id: item.product_id ?? 0,
        location_id: item.location_id ?? 0,
        inbound_header_id: item.inbound_header_id ?? null,
      }))

      setData(normalizedData)
      setTotalCount(json.count ?? 0)
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, currentPage])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.product_code) params.set('product_code', filters.product_code)
    if (filters.location) params.set('location', filters.location)
    if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id)
    if (currentPage > 1) params.set('page', String(currentPage))
    const qs = params.toString()
    router.replace(`/inventory?${qs}`, { scroll: false })
  }, [filters, currentPage, router])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const exportCSV = () => {
    const params = new URLSearchParams()
    if (filters.product_code) params.set('product_code', filters.product_code)
    if (filters.location) params.set('location', filters.location)
    if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id)
    params.set('format', 'csv')
    window.open(`/api/export?type=inventory&${params.toString()}`)
  }

  const openUpdateModal = async (item: InventoryItem) => {
    setSelectedItem(item)
    setTransferQty(item.qty)
    setIsDamage(item.damage)
    setToLocationInput('')
    setShowSuggestions(false)
    setUpdateError('')

    const whId = item.warehouse_id || userWhId
    if (whId) {
      try {
        const res = await fetch(`/api/locations?warehouse_id=${whId}`)
        if (res.ok) {
          const locs = await res.json()
          setLocations(locs)
        } else {
          setLocations([])
        }
      } catch {
        setLocations([])
      }
    }
  }

  const handleLocationInputChange = (value: string) => {
    setToLocationInput(value)
    if (value.trim().length >= 1) {
      const filtered = locations.filter(
        loc =>
          loc.name.toLowerCase().includes(value.trim().toLowerCase()) ||
          (loc.barcode && loc.barcode.toLowerCase().includes(value.trim().toLowerCase()))
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (loc: LocationOption) => {
    setToLocationInput(`${loc.name} ${loc.barcode ? `(${loc.barcode})` : ''}`)
    setShowSuggestions(false)
  }

  const handleTransfer = async () => {
    if (!selectedItem) return
    if (transferQty <= 0) {
      setUpdateError('Qty harus > 0')
      return
    }

    let finalToLocationId: number | undefined = selectedItem.location_id
    if (toLocationInput.trim()) {
      let found = locations.find(
        loc =>
          loc.name.toLowerCase() === toLocationInput.trim().toLowerCase() ||
          (loc.barcode && loc.barcode.toLowerCase() === toLocationInput.trim().toLowerCase())
      )
      if (!found) {
        const match = toLocationInput.trim().match(/^(.+?)\s*\(.*\)$/)
        if (match) {
          const nameOnly = match[1].trim().toLowerCase()
          found = locations.find(
            loc =>
              loc.name.toLowerCase() === nameOnly ||
              (loc.barcode && loc.barcode.toLowerCase() === nameOnly)
          )
        }
      }
      if (found) {
        finalToLocationId = found.id
      } else {
        setUpdateError('Lokasi tujuan tidak valid')
        return
      }
    }

    const warehouseId = selectedItem.warehouse_id || userWhId
    if (!warehouseId || !selectedItem.product_id || !selectedItem.location_id) {
      setUpdateError('Data item tidak lengkap (warehouse/produk/lokasi)')
      return
    }

    // Pastikan inbound_header_id tersedia
    const sourceInboundId = selectedItem.inbound_header_id
    if (sourceInboundId == null) {
      setUpdateError('Stok ini tidak memiliki referensi inbound. Tidak dapat dipindahkan.')
      return
    }

    setUpdating(true)
    setUpdateError('')
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          product_id: selectedItem.product_id,
          from_location_id: selectedItem.location_id,
          to_location_id: finalToLocationId,
          qty: transferQty,
          source_damage: selectedItem.damage,
          target_damage: isDamage,
          source_inbound_header_id: sourceInboundId,   // ⬅️ dikirim
        }),
      })
      if (!res.ok) {
        let msg = 'Gagal transfer'
        try { const d = await res.json(); msg = d.error || msg } catch { }
        throw new Error(msg)
      }
      setSelectedItem(null)
      fetchData()
    } catch (err: any) {
      setUpdateError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const columns = ['Produk', 'Kode', 'UOM', 'Lokasi', 'Qty', 'Damage', 'Last Update', 'Aksi']
  const tableData = data.map(item => [
    item.product_name,
    item.product_code,
    item.uom_name,
    `${item.location_name} (${item.location_barcode})`,
    item.qty.toLocaleString(),
    item.damage ? 'Ya' : 'Tidak',
    new Date(item.updated_at).toLocaleString('id-ID'),
    <button
      key={item.id}
      onClick={() => openUpdateModal(item)}
      className="text-blue-600 hover:underline text-xs font-medium"
    >
      Update
    </button>,
  ])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Filter Bar */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <Input
            label="Kode Produk"
            placeholder="Cari kode..."
            value={filters.product_code}
            onChange={e => handleFilterChange('product_code', e.target.value)}
          />
          <Input
            label="Lokasi"
            placeholder="Cari lokasi..."
            value={filters.location}
            onChange={e => handleFilterChange('location', e.target.value)}
          />
          <div className="flex items-center gap-2 pb-3">
            <Button onClick={() => { setCurrentPage(1); fetchData(); }} variant="primary">
              Filter
            </Button>
            <Button onClick={exportCSV} variant="secondary">
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{item.product_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.product_code}</td>
                  <td className="px-4 py-3 text-gray-600">{item.uom_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.location_name}{' '}
                    <span className="text-xs text-gray-400">({item.location_barcode})</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{item.damage ? 'Ya' : 'Tidak'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(item.updated_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openUpdateModal(item)}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                  Tidak ada data stok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-gray-500">
            Halaman {currentPage} dari {totalPages} ({totalCount} data)
          </p>
          <div className="flex items-center gap-1">
            {currentPage > 1 ? (
              <Button variant="secondary" onClick={() => setCurrentPage(currentPage - 1)}>
                ← Prev
              </Button>
            ) : (
              <span className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-white border border-gray-100 rounded-md cursor-not-allowed">
                ← Prev
              </span>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
              const p = start + i
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${p === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {p}
                </button>
              )
            })}
            {currentPage < totalPages ? (
              <Button variant="secondary" onClick={() => setCurrentPage(currentPage + 1)}>
                Next →
              </Button>
            ) : (
              <span className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-white border border-gray-100 rounded-md cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      )}

      {/* Modal Update */}
      {selectedItem && (
        <Modal onClose={() => setSelectedItem(null)} title="Update Stok">
          <div className="space-y-4">
            <p><strong>Produk:</strong> {selectedItem.product_name} ({selectedItem.product_code})</p>
            <p><strong>Lokasi Asal:</strong> {selectedItem.location_name}</p>
            <div className="text-sm">Stok tersedia: {selectedItem.qty}</div>

            <Input
              label="Qty Dipindahkan"
              type="number"
              value={transferQty}
              onChange={e => setTransferQty(Number(e.target.value))}
              min={1}
              max={selectedItem.qty}
            />

            <div>
              <label className="block text-sm font-medium mb-1">Lokasi Tujuan (kosongkan jika tetap di lokasi ini)</label>
              <div className="relative">
                <Input
                  value={toLocationInput}
                  onChange={e => handleLocationInputChange(e.target.value)}
                  placeholder="Ketik nama/barcode lokasi..."
                  onFocus={() => toLocationInput.trim().length >= 1 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded shadow-lg mt-1 w-full max-h-40 overflow-y-auto">
                    {suggestions.map(loc => (
                      <div
                        key={loc.id}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                        onMouseDown={() => selectSuggestion(loc)}
                      >
                        {loc.name} {loc.barcode ? `(${loc.barcode})` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDamage}
                onChange={(e) => setIsDamage(e.target.checked)}
              />
              <label>Tandai sebagai rusak (damage)</label>
            </div>

            {updateError && <Alert type="error" message={updateError} onClose={() => setUpdateError('')} />}

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setSelectedItem(null)}>Batal</Button>
              <Button onClick={handleTransfer} disabled={updating}>
                {updating ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}