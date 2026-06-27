'use client'
import Table from '@/components/ui/Table'

export default function BrandTable({ brands }: { brands: any[] }) {
  const columns = ['Nama', 'Company']
  const data = brands.map(b => [b.name, b.dim_company?.name || 'Global'])
  return <Table columns={columns} data={data} />
}