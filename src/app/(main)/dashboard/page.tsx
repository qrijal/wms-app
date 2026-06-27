import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('dim_users')
    .select('role, wh_id')
    .eq('id', user!.id)
    .single()

  // Placeholder: tampilkan jumlah transaksi yang belum selesai (header tanpa detail)
  const { count: inboundCount } = await supabase
    .from('inbound_header')
    .select('*', { count: 'exact', head: true })
    .is('ref_no', null) // contoh kondisi "belum selesai", sesuaikan dengan bisnis
  const { count: outboundCount } = await supabase
    .from('outbound_header')
    .select('*', { count: 'exact', head: true })
    .is('ref_no', null)
  const { count: transferCount } = await supabase
    .from('tf_location_header')
    .select('*', { count: 'exact', head: true })
    .is('ref_no', null)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-500 mb-6">Selamat datang, {profile?.role}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold">Inbound Belum Selesai</h2>
          <p className="text-3xl">{inboundCount ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold">Outbound Belum Selesai</h2>
          <p className="text-3xl">{outboundCount ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold">Transfer Belum Selesai</h2>
          <p className="text-3xl">{transferCount ?? 0}</p>
        </div>
      </div>
    </div>
  )
}