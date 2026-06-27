import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function OperatorInboundList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('dim_users').select('role, wh_id').eq('id', user!.id).single()

  // Operator hanya melihat inbound di warehouse-nya
  const { data: inbounds } = await supabase
    .from('inbound_header')
    .select('*, inbound_detail(count)')
    .eq('warehouse_id', profile?.wh_id)
    .in('status', ['DRAFT', 'RECEIVING', 'PUTAWAY'])
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    RECEIVING: 'bg-yellow-100 text-yellow-800',
    PUTAWAY: 'bg-blue-100 text-blue-800',
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Inbound Perlu Diproses</h1>
      {inbounds?.map(inv => (
        <Link key={inv.id} href={`/operator/inbound/${inv.id}`} className="block bg-white shadow rounded p-4 mb-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{inv.ref_no || 'Tanpa Ref'}</p>
              <p className="text-sm text-gray-500">{inv.inbound_date} - {inv.inbound_detail?.[0]?.count || 0} item</p>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[inv.status] || ''}`}>
              {inv.status}
            </span>
          </div>
        </Link>
      ))}
      {inbounds?.length === 0 && (
        <p className="text-gray-500">Tidak ada inbound yang perlu diproses.</p>
      )}
    </div>
  )
}