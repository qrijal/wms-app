import { createClient } from '@/lib/supabase/server'
import CompaniesTable from './CompaniesTable'
import AddCompanyButton from './AddCompanyButton'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: companies, error } = await supabase
    .from('dim_company')
    .select('*')
    .order('name')

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Companies</h1>
        <AddCompanyButton />
      </div>
      {error ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <CompaniesTable companies={companies || []} />
      )}
    </div>
  )
}