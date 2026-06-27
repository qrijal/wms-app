'use client'
import Table from '@/components/ui/Table'

interface UsersTableProps {
  users: any[]
}

export default function UsersTable({ users }: UsersTableProps) {
  const columns = ['Nama', 'Email', 'Role', 'Warehouse']
  const data = users.map((user) => [
    user.full_name || '-',
    user.email || '-',
    user.role || '-',
    user.dim_warehouses?.name || '-',
  ])
  return <Table columns={columns} data={data} />
}