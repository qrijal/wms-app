'use client'
import Table from '@/components/ui/Table'

interface LocationTableProps {
  locations: any[]
}

export default function LocationTable({ locations }: LocationTableProps) {
  const columns = ['Nama', 'Barcode', 'Warehouse']
  const data = locations.map(loc => [
    loc.name,
    loc.barcode || '-',
    loc.dim_warehouses?.name || '-',
  ])
  return <Table columns={columns} data={data} />
}