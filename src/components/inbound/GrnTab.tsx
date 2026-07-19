'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface GrnTabProps {
  headerId: string
  status: string 
  details: any[] 
  onRefresh?: () => Promise<void> | void
}

export default function GrnTab({ headerId, status, details, onRefresh }: GrnTabProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Flatten data untuk ditampilkan di tabel
  const tableData = details.flatMap((detail) => {
    return (detail.receiving_details || []).map((rec: any) => ({
      id: rec.id,
      product_code: detail.product_code,
      product_name: detail.dim_products?.name || '-',
      batch_number: detail.batch_number || '-',
      expired_date: detail.expired_date || '-',
      pallet_id: rec.pallet_id || '-',
      qty: rec.qty_received,
      is_damage: rec.is_damage,
    }))
  })

  const handleSubmitGRN = async () => {
    setIsLoading(true)

    try {
      const res = await fetch(`/api/inbound/header/${headerId}/grn`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to submit GRN')

      toast.success('GRN has been successfully submitted!')
      
      if (onRefresh) {
        await onRefresh()
      } else {
        router.refresh() 
      }
      
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while submitting GRN')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header & Button Section */}
      <div className="px-6 py-5 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">Goods Receipt Note (GRN)</h2>
        
        {/* Tombol HANYA muncul jika status BUKAN GRN */}
        {status !== 'GRN' && (
          <button
            onClick={handleSubmitGRN}
            disabled={isLoading || tableData.length === 0}
            className="px-4 py-2.5 bg-[#1c2434] text-white rounded-md hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Submit GRN
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-y border-gray-100 bg-slate-50/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Code</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expired Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pallet ID</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-sm">
                  No items received yet.
                </td>
              </tr>
            ) : (
              tableData.map((row, idx) => (
                <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{row.product_code}</td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-medium">{row.product_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.batch_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.expired_date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.pallet_id}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600 text-center">{row.qty}</td>
                  <td className="px-6 py-4 text-center">
                    {row.is_damage ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        Damaged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Good
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}