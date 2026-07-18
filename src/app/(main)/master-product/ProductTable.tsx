'use client'
import Table from '@/components/ui/Table'

interface ProductTableProps {
  products: any[]
  showWarehouse?: boolean
}

export default function ProductTable({ products, showWarehouse }: ProductTableProps) {
  const columns = showWarehouse
    ? ['Nama', 'Product Code', 'Brand', 'UOM', 'Warehouse']
    : ['Nama', 'Product Code', 'Brand', 'UOM']

  const data = products.map((p) => {
    const row = [
      p.name,
      p.product_code,
      p.dim_product_brand?.name || '-',
      p.dim_product_uom?.name || '-',
    ]
    if (showWarehouse) row.push(p.dim_warehouses?.name || '-')
    return row
  })

  return <Table columns={columns} data={data} />
}