import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PICKING: 'bg-yellow-100 text-yellow-800',
}

export default async function OperatorOutboundList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('dim_users').select('wh_id').eq('id', user!.id).single()

  const { data: outbounds } = await supabase
    .from('outbound_header')
    .select('*, outbound_detail(count)')
    .eq('warehouse_id', profile?.wh_id)
    .in('status', ['DRAFT', 'PICKING'])          // ⬅️ hanya status yang perlu diproses
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Outbound</h1>
      {outbounds?.map(out => (
        <Link
          key={out.id}
          href={`/operator/outbound/${out.id}`}
          className="block bg-white shadow rounded p-4 mb-2"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{out.ref_no || 'Tanpa Ref'}</p>
              <p className="text-sm text-gray-500">
                {new Date(out.outbound_date).toLocaleDateString()} - {out.outbound_detail?.[0]?.count || 0} item
              </p>
              {out.nopol && <p className="text-xs text-gray-600">Nopol: {out.nopol}</p>}
              {out.nama_driver && <p className="text-xs text-gray-600">Driver: {out.nama_driver}</p>}
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[out.status] || ''}`}>
              {out.status}
            </span>
          </div>
        </Link>
      ))}
      {(!outbounds || outbounds.length === 0) && (
        <p className="text-gray-500">Tidak ada outbound yang perlu diproses.</p>
      )}
    </div>
  )
}