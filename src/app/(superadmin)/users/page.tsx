import { createClient } from '@/lib/supabase/server'
import UsersTable from './UsersTable'
import AddUserButton from './AddUserButton'

export default async function UsersPage() {
  const supabase = await createClient()
  
  const { data: users } = await supabase
    .from('dim_users')
    .select('id, full_name, email, role, wh_id, dim_warehouses(name)')
    .in('role', ['admin', 'operator'])  // ambil admin dan operator
    .order('full_name')

  const { data: warehouses } = await supabase
    .from('dim_warehouses')
    .select('id, name')
    .order('name')

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manajemen Admin</h1>
        <AddUserButton warehouses={warehouses || []} />
      </div>
      <UsersTable users={users || []} />
    </div>
  )
}