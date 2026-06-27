'use client'
import Table from '@/components/ui/Table'

export default function UomPairTable({ pairs }: { pairs: any[] }) {
  const columns = ['Primary UOM', 'Secondary UOM', 'Faktor Konversi', 'Company']
  const data = pairs.map(p => [
    p.primary_name,
    p.secondary_name,
    `${p.secondary_name} = ${p.conversion_factor} ${p.primary_name}`,
    p.company_name,
  ])
  return <Table columns={columns} data={data} />
}