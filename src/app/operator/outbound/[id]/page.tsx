import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OutboundProcess from '@/components/outbound/OutboundProcess'

export default async function OperatorOutboundDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('dim_users').select('wh_id').eq('id', user!.id).single()

  const { data: header } = await supabase
    .from('outbound_header')
    .select('*')
    .eq('id', id)
    .single()

  if (!header) notFound()
  if (header.warehouse_id !== profile?.wh_id) return <div>Akses ditolak</div>

  const { data: detailData } = await supabase
    .from('outbound_detail')
    .select('*, dim_products(name)')
    .eq('header_id', id)
    .order('id')

  let details = detailData || []

  if (details.length > 0) {
    const detailIds = details.map(d => d.id)
    const { data: pickingData } = await supabase
      .from('outbound_picking_detail')
      .select('*, dim_location(name, barcode)')
      .in('detail_id', detailIds)

    details = details.map(detail => ({
      ...detail,
      picking_details: pickingData?.filter(p => p.detail_id === detail.id) || [],
    }))
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Outbound #{header.ref_no || header.id}</h1>
      <p className="text-sm text-gray-500 mb-4">
        Tanggal: {header.outbound_date} | Status: {header.status}
      </p>
      {header.nopol && <p className="text-sm text-gray-600">No. Polisi: {header.nopol}</p>}
      {header.nama_driver && <p className="text-sm text-gray-600">Driver: {header.nama_driver}</p>}
      <OutboundProcess header={header} details={details} warehouseId={profile!.wh_id} />
    </div>
  )
}