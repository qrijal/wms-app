'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Search, MapPin, Download, Filter, X, ArrowRightLeft, 
  AlertTriangle, Save, Map, PackageSearch, ChevronLeft, ChevronRight 
} from 'lucide-react'

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
  pallet_id:string
  damage: boolean
  inbound_header_id?: number | null
  batch_number:string
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

  // Modal State
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
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal memuat data')
      
      const json = await res.json()
      if (!json || !Array.isArray(json.data)) throw new Error('Format data tidak valid')

      setData(json.data)
      setTotalCount(json.count ?? 0)
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
      setData([])
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
    router.replace(`/inventory?${params.toString()}`, { scroll: false })
  }, [filters, currentPage, router])

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
        if (res.ok) setLocations(await res.json())
      } catch { setLocations([]) }
    }
  }

  const handleLocationInputChange = (value: string) => {
    setToLocationInput(value)
    if (value.trim().length >= 1) {
      const filtered = locations.filter(loc =>
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

  const handleTransfer = async () => {
    if (!selectedItem) return
    if (transferQty <= 0) { setUpdateError('Qty harus lebih besar dari 0'); return }

    let finalToLocationId: number | undefined = selectedItem.location_id
    if (toLocationInput.trim()) {
      let found = locations.find(loc =>
        loc.name.toLowerCase() === toLocationInput.trim().toLowerCase() ||
        (loc.barcode && loc.barcode.toLowerCase() === toLocationInput.trim().toLowerCase())
      )
      if (!found) {
        const match = toLocationInput.trim().match(/^(.+?)\s*\(.*\)$/)
        if (match) {
          const nameOnly = match[1].trim().toLowerCase()
          found = locations.find(loc => loc.name.toLowerCase() === nameOnly || (loc.barcode && loc.barcode.toLowerCase() === nameOnly))
        }
      }
      if (found) finalToLocationId = found.id
      else { setUpdateError('Lokasi tujuan tidak valid'); return }
    }

    const warehouseId = selectedItem.warehouse_id || userWhId
    if (!warehouseId || !selectedItem.product_id || !selectedItem.location_id) {
      setUpdateError('Data item tidak lengkap')
      return
    }

    if (selectedItem.inbound_header_id == null) {
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
          source_inbound_header_id: selectedItem.inbound_header_id,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal transfer stok')
      
      setSelectedItem(null)
      fetchData()
    } catch (err: any) {
      setUpdateError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const columns = ['Produk', 'Kode (UOM)', 'Lokasi', 'Qty', 'Batch','Damage', 'Pallet ID', 'Aksi']

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kode Produk</label>
            <div className="relative">
              <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={filters.product_code}
                onChange={e => { setFilters(p => ({ ...p, product_code: e.target.value })); setCurrentPage(1) }}
                placeholder="Cari kode..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lokasi</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={filters.location}
                onChange={e => { setFilters(p => ({ ...p, location: e.target.value })); setCurrentPage(1) }}
                placeholder="Cari lokasi..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:col-span-2 md:justify-end">
            <button 
              onClick={() => { setCurrentPage(1); fetchData(); }} 
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Filter size={16} /> Terapkan Filter
            </button>
            <button 
              onClick={exportCSV} 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map(col => (
                  <th key={col} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 italic">
                    Memuat data stok...
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.product_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{item.product_code}</span>
                      <span className="ml-2 text-slate-500 text-xs">({item.uom_name})</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {item.location_name} <span className="text-xs text-slate-400">({item.location_barcode})</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.qty.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{item.batch_number}</td>
                    <td className="px-6 py-4 text-sm">
                      {item.damage ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          <AlertTriangle size={12}/> Ya
                        </span>
                      ) : (
                        <span className="text-slate-400">Tidak</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{item.pallet_id}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openUpdateModal(item)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowRightLeft size={14}/> Transfer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-400 italic">
                    Tidak ada data stok yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Halaman {currentPage} dari {totalPages} <span className="mx-1">•</span> {totalCount} data
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
                  const p = start + i
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg transition-colors ${
                        p === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Update (Transfer) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-800">Transfer Stok</h2>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition-colors"><X size={20} strokeWidth={2.5}/></button>
            </div>

            <div className="p-6 space-y-5">
              {updateError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{updateError}</div>}

              {/* Info Produk (Read Only) */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-2">
                <p className="text-sm text-slate-500 mb-1">Produk Terpilih</p>
                <p className="font-bold text-slate-800">{selectedItem.product_name}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Map size={14}/> {selectedItem.location_name}</span>
                  <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Tersedia: {selectedItem.qty} {selectedItem.uom_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Qty Transfer</label>
                  <input
                    type="number"
                    value={transferQty}
                    onChange={e => setTransferQty(Number(e.target.value))}
                    min={1}
                    max={selectedItem.qty}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Lokasi Tujuan</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={toLocationInput}
                      onChange={e => handleLocationInputChange(e.target.value)}
                      placeholder="Ketik lokasi tujuan..."
                      onFocus={() => toLocationInput.trim().length >= 1 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 w-full max-h-40 overflow-y-auto">
                        {suggestions.map(loc => (
                          <div
                            key={loc.id}
                            className="px-4 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 text-sm text-slate-700"
                            onMouseDown={() => {
                              setToLocationInput(`${loc.name} ${loc.barcode ? `(${loc.barcode})` : ''}`)
                              setShowSuggestions(false)
                            }}
                          >
                            <span className="font-medium">{loc.name}</span> {loc.barcode && <span className="text-slate-400 text-xs ml-1">({loc.barcode})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Kondisi */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Kondisi Barang Tujuan</label>
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isDamage}
                    onChange={(e) => setIsDamage(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Tandai sebagai rusak (Damage)</p>
                    <p className="text-xs text-slate-500">Stok ini akan dicatat sebagai barang cacat di lokasi tujuan.</p>
                  </div>
                </label>
              </div>

            </div>

            <div className="flex items-center justify-end gap-6 px-6 py-5 border-t border-gray-100 bg-white">
              <button type="button" onClick={() => setSelectedItem(null)} className="text-sm font-bold text-blue-700 hover:text-blue-800">Batal</button>
              <button 
                onClick={handleTransfer} 
                disabled={updating}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-70"
              >
                <Save size={18} /> {updating ? 'Memproses...' : 'Konfirmasi Transfer'}
              </button> 
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}