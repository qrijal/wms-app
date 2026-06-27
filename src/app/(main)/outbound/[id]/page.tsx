import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OutboundProcess from '@/components/outbound/OutboundProcess'

export default async function OutboundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getUserProfile()
  const supabase = await createClient()

  const { data: header } = await supabase
    .from('outbound_header')
    .select('*')
    .eq('id', id)
    .single()

  if (!header) notFound()
  if (profile.role !== 'superadmin' && header.warehouse_id !== profile.wh_id) {
    return <div>Anda tidak memiliki akses ke outbound ini.</div>
  }

  const { data: detailData } = await supabase
    .from('outbound_detail')
    .select('*, dim_products(name)')
    .eq('header_id', id)
    .order('id')

  let details = detailData || []

  // Ambil picking_details
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
      <h1 className="text-2xl font-bold mb-2">Outbound #{header.ref_no || header.id}</h1>
      <p className="text-gray-500 mb-4">Tanggal: {header.outbound_date} | Status: {header.status}</p>
      {header.nopol && <p className="text-sm text-gray-600">No. Polisi: {header.nopol}</p>}
      {header.nama_driver && <p className="text-sm text-gray-600">Driver: {header.nama_driver}</p>}
      <OutboundProcess header={header} details={details} warehouseId={profile.wh_id!} />
    </div>
  )
}