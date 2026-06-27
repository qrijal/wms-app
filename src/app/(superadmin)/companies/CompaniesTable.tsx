'use client'
import Table from '@/components/ui/Table'

interface CompaniesTableProps {
  companies: any[]
}

export default function CompaniesTable({ companies }: CompaniesTableProps) {
const columns = ['ID', 'Nama', 'Alamat', 'Dibuat']
  const data = companies.map((c) => [
    c.id,
    c.name,
    c.address,
    new Date(c.created_at).toLocaleDateString(),
  ])

  return <Table columns={columns} data={data} />
}