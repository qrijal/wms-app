import { createClient } from '@/lib/supabase/server'
import BranchesTable from './BranchesTable'
import AddBranchButton from './AddBranchButton'

export default async function BranchesPage() {
  const supabase = await createClient()
  const { data: branches } = await supabase
    .from('dim_branch')
    .select('*, dim_company(name)')
    .order('name')
  
  // Dapatkan daftar company untuk dropdown filter
  const { data: companies } = await supabase
    .from('dim_company')
    .select('id, name')
    .order('name')
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Branches</h1>
        <AddBranchButton companies={companies || []} />
      </div>
      <BranchesTable branches={branches || []} />
    </div>
  )
}