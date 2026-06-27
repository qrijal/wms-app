'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const STATUS_OPTIONS = ['DRAFT', 'RECEIVING', 'PUTAWAY', 'GRN']

export default function InboundSearch({ defaultValue }: { defaultValue?: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState(defaultValue || '')
    const [status, setStatus] = useState(searchParams.get('status') || '')
    const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '')
    const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '')

    // Sinkronkan jika defaultValue berubah
    useEffect(() => {
        setSearch(defaultValue || '')
    }, [defaultValue])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search.trim())
        if (status) params.set('status', status)          // hanya jika dipilih
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)
        // Reset halaman ke 1
        params.delete('page')
        router.push(`/inbound?${params.toString()}`)
    }

    const handleReset = () => {
        setSearch('')
        setStatus('')
        setDateFrom('')
        setDateTo('')
        router.push('/inbound')
    }

    const toTitleCase = (s: string) =>
        s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
            {/* No. Referensi */}
            <div className="flex-1 w-[20%]">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">No. Referensi</label>
                <input
                    type="text"
                    placeholder="Cari No. Surat Jalan..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>

            {/* Status Dropdown */}
            <div className="flex-1 w-min-[150px]">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Status</label>
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                    <option value="">Semua Status</option>
                    {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{toTitleCase(s)}</option>
                    ))}
                </select>
            </div>

            {/* Rentang tanggal */}
            <div className="w-[20%] flex-1 items-center gap-1">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Dari</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

            </div>
            <div className="w-[20%] flex-1 items-center gap-1">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Sampai</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Tombol */}
            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-sm"
                >
                    Filter
                </button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                >
                    Reset
                </button>
            </div>
        </form >
    )
}