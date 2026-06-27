'use client'
import Table from '@/components/ui/Table'

interface ProductTableProps {
  products: any[]
  showBranch?: boolean
}

export default function ProductTable({ products, showBranch }: ProductTableProps) {
  const columns = showBranch
    ? ['Nama', 'Product Code', 'Brand', 'UOM', 'Konversi', 'Branch']
    : ['Nama', 'Product Code', 'Brand', 'UOM', 'Konversi']

  const data = products.map((p) => {
    const uom = p.dim_product_uom
    const uomName = uom?.name || '-'
    const primaryName = uom?.base_uom_id?.name || 'Primary'
    const factor = uom?.conversion_factor
    const konversi = factor
      ? `1 ${uomName} = ${factor} ${primaryName}`
      : '-'

    const row = [
      p.name,
      p.product_code,
      p.dim_product_brand?.name || '-',
      uomName,
      konversi,
    ]
    if (showBranch) row.push(p.dim_branch?.name || '-')
    return row
  })

  return <Table columns={columns} data={data} />
}