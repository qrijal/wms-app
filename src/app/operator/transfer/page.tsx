import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TransferList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('dim_users').select('wh_id').eq('id', user!.id).single()

  const { data: transfers } = await supabase
    .from('tf_location_header')
    .select('*, tf_location_detail(count)')
    .eq('warehouse_id', profile?.wh_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Transfer Stock</h1>
        <Link href="/operator/transfer/new" className="bg-blue-600 text-white px-4 py-2 rounded">
          Transfer Baru
        </Link>
      </div>
      {transfers?.map(t => (
        <Link key={t.id} href={`/operator/transfer/${t.id}`} className="block bg-white shadow rounded p-4 mb-2">
          <div className="flex justify-between">
            <span>{t.ref_no || 'Tanpa Ref'}</span>
            <span className="text-sm">{t.tf_location_detail?.[0]?.count || 0} item</span>
          </div>
          <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</div>
        </Link>
      ))}
    </div>
  )
}