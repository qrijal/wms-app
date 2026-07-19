// components/inbound/InboundProcess.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReceivingTab from './ReceivingTab'
import PutawayTab from './PutawayTab'
import GrnTab from './GrnTab'
import { ArrowLeft, ClipboardCheck, Warehouse  , Receipt } from 'lucide-react' // Tambahkan import icon

interface InboundProcessProps {
  header: any | null            // ⚠️ header bisa null/undefined
  details: any[]
  warehouseId: number
}

export default function InboundProcess({
  header,
  details: initialDetails,
  warehouseId,
}: InboundProcessProps) {
  const router = useRouter()

  // ── Guard paling awal ──
  if (!header) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold text-center">
        Data header inbound tidak tersedia.
      </div>
    )
  }

  const getDefaultTab = (status: string) => {
    if (status === 'GRN') return 'grn'
    if (status === 'PUTAWAY') return 'putaway'
    if (status === 'RECEIVING') return 'putaway'
    return 'receiving'
  }

  // ✅ Sekarang aman karena header sudah pasti terdefinisi
  const [activeTab, setActiveTab] = useState(getDefaultTab(header.status))
  const [currentDetails, setCurrentDetails] = useState(initialDetails)
  const [currentStatus, setCurrentStatus] = useState(header.status)

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/inbound/header/${header.id}/details`)
      if (res.ok) {
        const data = await res.json()
        setCurrentDetails(data.details)
        setCurrentStatus(data.status)
      }
      router.refresh()
    } catch (err) {
      console.error('Gagal refresh data:', err)
    }
  }

  // Definisi Tabs beserta Icon-nya
  const tabs = [
    { key: 'receiving', label: 'Receiving', icon: ClipboardCheck },
    { key: 'putaway', label: 'Putaway', icon: Warehouse  },
    { key: 'grn', label: 'GRN', icon: Receipt },
  ]

  // Warna dinamis untuk badge status
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT': return 'bg-orange-500 text-white'
      case 'RECEIVING': return 'bg-blue-500 text-white'
      case 'PUTAWAY': return 'bg-indigo-500 text-white'
      case 'GRN': return 'bg-green-500 text-white'
      default: return 'bg-slate-500 text-white'
    }
  }

  return (
    <div className="w-full">
      {/* ── HEADER SECTION (Disembunyikan saat mode Print) ── */}
      <div className="print:hidden">
        
        {/* Header Dokumen */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pt-2">
          <div className="flex items-start gap-4">
            {/* Tombol Back */}
            <button 
              onClick={() => router.back()} 
              className="mt-1.5 p-2 border-2 border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            
            {/* Info Dokumen */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Inbound Delivery</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(currentStatus)}`}>
                  {currentStatus}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                {header.doc_number || `#DO-${String(header.id).padStart(4, '0')}`}
              </h1>
            </div>
          </div>

          {/* Info Tanggal Kedatangan */}
          <div className="text-left sm:text-right pl-14 sm:pl-0">
            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">Arrival Date</span>
            <div className="flex items-center sm:justify-end gap-2 text-slate-800 font-semibold text-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span>{header.arrival_date ? new Date(header.arrival_date).toISOString().split('T')[0] : '2026-07-16'}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigasi */}
        <div className="flex gap-8 border-b border-slate-200 mb-6 px-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 py-4 border-b-2 font-semibold text-[15px] transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="w-full">
        {activeTab === 'receiving' && (
          <ReceivingTab
            details={currentDetails}
            warehouseId={warehouseId}
            headerId={header.id}
            headerStatus={currentStatus}
            onRefresh={refreshData}
          />
        )}
        {activeTab === 'putaway' && (
          <PutawayTab
            details={currentDetails}
            warehouseId={warehouseId}
            headerId={header.id}
            headerStatus={currentStatus}
            onRefresh={refreshData}
          />
        )}
        {activeTab === 'grn' && (
          <GrnTab
            headerId={header.id}
            details={currentDetails}
            currentStatus={currentStatus}
            onRefresh={refreshData}
            status={header.status}
          />
        )}
      </div>
    </div>
  )
}