import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PICKING: 'bg-yellow-100 text-yellow-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default async function OutboundListPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  let query = supabase
    .from('outbound_header')
    .select('*, outbound_detail(count)')
    .order('created_at', { ascending: false })

  if (profile.role !== 'superadmin') {
    query = query.eq('warehouse_id', profile.wh_id)
  }

  const { data: outbounds } = await query

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Outbound</h1>
        <Link href="/outbound/create" className="bg-blue-600 text-white px-4 py-2 rounded">
          Buat Outbound
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Ref</th>
              <th className="px-4 py-2 text-left">Tanggal</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-left">Nopol</th>
              <th className="px-4 py-2 text-left">Driver</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {outbounds?.map((out: any) => (
              <tr key={out.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{out.ref_no || '-'}</td>
                <td className="px-4 py-2">{new Date(out.outbound_date).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[out.status] || ''}`}>
                    {out.status}
                  </span>
                </td>
                <td className="px-4 py-2">{out.outbound_detail?.[0]?.count || 0}</td>
                <td className="px-4 py-2">{out.nopol || '-'}</td>
                <td className="px-4 py-2">{out.nama_driver || '-'}</td>
                <td className="px-4 py-2">
                  <Link href={`/outbound/${out.id}`} className="text-blue-600 hover:underline">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}