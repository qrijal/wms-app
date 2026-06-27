'use client'
import Table from '@/components/ui/Table'

export default function BranchesTable({ branches }: { branches: any[] }) {
  const columns = ['ID', 'Nama Branch', 'Perusahaan','Total Gudang', 'Dibuat']
  const data = branches.map(b => [
    b.id,
    b.name,
    b.dim_company?.name || '-',
    b.warehouses_count || 0,
    new Date(b.created_at).toLocaleDateString(),
  ])
  return <Table columns={columns} data={data} />
}