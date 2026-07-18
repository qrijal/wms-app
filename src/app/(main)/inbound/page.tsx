// src/app/(main)/inbound/page.tsx
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import InboundSearch from '@/components/inbound/InboundSearch'
import { revalidatePath } from 'next/cache'
import CancelInboundButton from '@/components/inbound/CancelInboundButton'
import InboundActionMenu from '@/components/inbound/InboundActionMenu'

const PAGE_SIZE = 20

// Konfigurasi status, pastikan "CANCELED" terdaftar di sini
const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  RECEIVING: { label: 'Receiving', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  PUTAWAY: { label: 'Putaway', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  GRN: { label: 'GRN Done', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  CANCELED: { label: 'Canceled', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    date_from?: string
    date_to?: string
    page?: string
  }>
}

export default async function InboundListPage({ searchParams }: PageProps) {
  const {
    search = '',
    status: statusFilter = '',
    date_from: dateFromParam = '',
    date_to: dateToParam = '',
    page: pageParam = '1',
  } = await searchParams

  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const profile = await getUserProfile()
  const supabase = await createClient()

  // --- SERVER ACTION UNTUK UPDATE STATUS KE CANCELED ---
  const cancelInbound = async (formData: FormData) => {
    'use server'
    const id = formData.get('id') as string
    if (!id) return

    const supabaseServer = await createClient()

    // Melakukan update ke tabel inbound_header
    const { error } = await supabaseServer
      .from('inbound_header')
      .update({ status: 'CANCELED' })
      .eq('id', id)

    if (error) {
      console.error('Gagal membatalkan inbound:', error)
    } else {
      // Me-refresh cache halaman agar perubahan status langsung terlihat di tabel
      revalidatePath('/inbound')
    }
  }

  const applyCommonFilters = (query: any) => {
    if (profile.role !== 'superadmin') {
      query = query.eq('warehouse_id', profile.wh_id)
    }
    return query
  }

  // Query data
  const dataQuery = () => {
    let q = supabase
      .from('inbound_header')
      .select('id, ref_no, inbound_date, status, inbound_detail(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
    q = applyCommonFilters(q)
    if (search) q = q.ilike('ref_no', `%${search}%`)
    if (statusFilter) q = q.eq('status', statusFilter)
    if (dateFromParam) q = q.gte('inbound_date', dateFromParam)
    if (dateToParam) q = q.lte('inbound_date', dateToParam)
    return q
  }

  const summaryQuery = () => {
    let q = supabase.from('inbound_header').select('status')
    return applyCommonFilters(q)
  }

  const { data: inbounds, count } = await dataQuery().range(offset, offset + PAGE_SIZE - 1)
  const { data: allForCount } = await summaryQuery()

  const statusCount = (allForCount ?? []).reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (dateFromParam) params.set('date_from', dateFromParam)
    if (dateToParam) params.set('date_to', dateToParam)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/inbound${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daftar Inbound</h1>
        </div>
        <Link
          href="/inbound/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <Suspense fallback={<div className="text-sm text-gray-400">Memuat filter…</div>}>
            <InboundSearch defaultValue={search} />
          </Suspense>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">No. Referensi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inbounds && inbounds.length > 0 ? (
                inbounds.map((inv: any) => {
                  const cfg = STATUS_CFG[inv.status] ?? { label: inv.status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
                  const itemCount = inv.inbound_detail?.[0]?.count ?? 0

                  return (
                    <tr key={inv.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                          {inv.ref_no || <span className="text-gray-400 font-normal">—</span>}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-500 tabular-nums">
                        {new Date(inv.inbound_date).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                          {itemCount}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Tombol Details */}
                          <Link
                            href={`/inbound/${inv.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2.5 py-1.5 rounded-md hover:bg-blue-50"
                          >
                            Details
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>

                          {/* Menu Dropdown Kebab (Titik Tiga) */}
                          <InboundActionMenu
                            id={inv.id}
                            status={inv.status}
                            cancelAction={cancelInbound}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm font-medium">
                        {(search || statusFilter || dateFromParam || dateToParam)
                          ? 'Tidak ada hasil dengan filter yang diterapkan'
                          : 'Belum ada data inbound'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">
              Halaman {currentPage} dari {totalPages} ({count} data)
            </p>
            <div className="flex items-center gap-1">
              {currentPage > 1 ? (
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-white border border-gray-100 rounded-md cursor-not-allowed">
                  ← Prev
                </span>
              )}

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
                const p = start + i
                return (
                  <Link
                    key={p}
                    href={buildPageUrl(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${p === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    {p}
                  </Link>
                )
              })}

              {currentPage < totalPages ? (
                <Link
                  href={buildPageUrl(currentPage + 1)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
                >
                  Next →
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-white border border-gray-100 rounded-md cursor-not-allowed">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}