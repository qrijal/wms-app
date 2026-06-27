// components/inbound/InboundProcess.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReceivingTab from './ReceivingTab'
import PutawayTab from './PutawayTab'
import GrnTab from './GrnTab'

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
  const router = useRouter()

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

  const tabs = [
    { key: 'receiving', label: 'Receiving' },
    { key: 'putaway', label: 'Putaway' },
    { key: 'grn', label: 'GRN' },
  ]

  return (
    <div>
      <div className="flex border-b mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
        />
      )}
    </div>
  )
}