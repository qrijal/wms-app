'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PickingTab from './PickingTab'     // akan dibuat nanti
import DispatchTab from './DispatchTab'

interface OutboundProcessProps {
  header: any
  details: any[]
  warehouseId: number
}

export default function OutboundProcess({ header, details: initialDetails, warehouseId }: OutboundProcessProps) {
  const getDefaultTab = (status: string) => {
    if (status === 'DISPATCHED') return 'dispatch'
    if (status === 'PICKING') return 'dispatch'     // default ke dispatch setelah picking selesai
    return 'picking'
  }

  const [activeTab, setActiveTab] = useState(getDefaultTab(header.status))
  const [currentDetails, setCurrentDetails] = useState(initialDetails)
  const [currentStatus, setCurrentStatus] = useState(header.status)
  const router = useRouter()

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/outbound/header/${header.id}/details`)
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
    { key: 'picking', label: 'Picking' },
    { key: 'dispatch', label: 'Dispatch' },
  ]

  return (
    <div>
      <div className="flex border-b mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 ${activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'picking' && (
        <PickingTab
          details={currentDetails}
          warehouseId={warehouseId}
          headerId={header.id}
          headerStatus={currentStatus}
          onRefresh={refreshData}
        />
      )}
      {activeTab === 'dispatch' && (
        <DispatchTab
          headerId={header.id}
          currentStatus={currentStatus}
          nopol={header.nopol}
          namaDriver={header.nama_driver}
          onRefresh={refreshData}
        />
      )}
    </div>
  )
}