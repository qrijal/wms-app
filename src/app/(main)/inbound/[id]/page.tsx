import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InboundProcess from '@/components/inbound/InboundProcess'

export default async function InboundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (id === 'create') notFound()

  const profile = await getUserProfile()
  const supabase = await createClient()

  const { data: header } = await supabase
    .from('inbound_header')
    .select('*')
    .eq('id', id)
    .single()

  if (!header) notFound()
  if (profile.role !== 'superadmin' && header.warehouse_id !== profile.wh_id) {
    return <div>Anda tidak memiliki akses ke inbound ini.</div>
  }

  // Detail (dengan receiving_details & putaway_details) sudah diambil via server
  const { data: detailData } = await supabase
    .from('inbound_detail')
    .select('*, dim_products(name)')
    .eq('header_id', id)
    .order('id')

  let details = detailData || []

  if (details.length > 0) {
    const detailIds = details.map(d => d.id)
    const { data: receivingDetails } = await supabase
      .from('inbound_receiving_detail')
      .select('*')
      .in('inbound_detail_id', detailIds)

    const { data: putawayDetails } = await supabase
      .from('inbound_putaway_detail')
      .select('*, dim_location(name, barcode)')
      .in('receiving_detail_id', (receivingDetails || []).map(r => r.id))

    details = details.map(detail => {
      const detailReceivings = receivingDetails?.filter(r => r.inbound_detail_id === detail.id) || []
      const totalReceived = detailReceivings.reduce((sum, r) => sum + (r.qty_received || 0), 0)
      const detailPutaways = putawayDetails?.filter(p => detailReceivings.some(r => r.id === p.receiving_detail_id)) || []
      const totalPutaway = detailPutaways.reduce((sum, p) => sum + (p.qty || 0), 0)

      return {
        ...detail,
        qty_received: totalReceived,
        qty_putaway: totalPutaway,
        receiving_details: detailReceivings,
        putaway_details: detailPutaways,
      }
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inbound #{header.ref_no || header.id}</h1>
      <p className="text-gray-500 mb-4">Tanggal: {header.inbound_date} | Status: {header.status}</p>
      <InboundProcess header={header} details={details} warehouseId={profile.wh_id!} />
    </div>
  )
}