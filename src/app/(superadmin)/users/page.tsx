import { createClient } from '@/lib/supabase/server'
import UsersTable from './UsersTable'
import AddUserButton from './AddUserButton'

export default async function UsersPage() {
  const supabase = await createClient()
  
  const { data: users } = await supabase
    .from('dim_users')
    .select('id, full_name, email, role, wh_id, dim_warehouses(name)')
    .in('role', ['admin', 'operator'])
    .order('full_name')

  const { data: warehouses } = await supabase
    .from('dim_warehouses')
    .select('id, name')
    .order('name')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Manajemen Admin</h1>
        <AddUserButton warehouses={warehouses || []} />
      </div>
      
      <UsersTable users={users || []} warehouses={warehouses || []} />
    </div>
  )
}