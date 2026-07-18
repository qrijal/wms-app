'use client'
import Table from '@/components/ui/Table'

export default function UomTable({ uoms }: { uoms?: any[] }) {
  const columns = ['Nama Satuan', 'Warehouse']
  const safeUoms = Array.isArray(uoms) ? uoms : []

  const data = safeUoms.map((u: any) => [
    u?.name ?? '-',
    u?.warehouse_name || 'Global',
  ])

  return <Table columns={columns} data={data} />
}