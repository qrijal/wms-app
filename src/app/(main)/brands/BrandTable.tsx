'use client'
import Table from '@/components/ui/Table'

interface BrandTableProps {
  brands: {
    id: number | string;
    name: string;
    warehouse_name: string;
  }[]
}

export default function BrandTable({ brands }: BrandTableProps) {
  const columns = ['Nama Brand', 'Warehouse']
  
  const data = brands.map(b => [
    b.name,
    b.warehouse_name,
  ])
  
  return <Table columns={columns} data={data} />
}