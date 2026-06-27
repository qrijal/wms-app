'use client'
import Table from '@/components/ui/Table'

export default function WarehousesTable({ warehouses }: { warehouses: any[] }) {
  const columns = ['ID', 'Nama Gudang', 'Branch', 'Lokasi', 'Dibuat']
  const data = warehouses.map(w => [
    w.id,
    w.name,
    w.dim_branch?.name || '-',
    w.location || '-',
    new Date(w.created_at).toLocaleDateString(),
  ])
  return <Table columns={columns} data={data} />
}