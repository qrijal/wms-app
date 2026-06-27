import { createClient } from '@/lib/supabase/server'
import WarehousesTable from './WarehousesTable'
import AddWarehouseButton from './AddWarehouseButton'

export default async function WarehousesPage() {
    const supabase = await createClient()
    const { data: warehouses } = await supabase
        .from('dim_warehouses')
        .select('*, dim_branch(name)')
        .order('name')

    // Dapatkan daftar branch untuk dropdown
    const { data: branches } = await supabase
        .from('dim_branch')
        .select('id, name')
        .order('name')
    const { data: companies } = await supabase
    .from('dim_company')
    .select('id, name')
    .order('name')
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Warehouses</h1>
                <AddWarehouseButton branches={branches || []} />
            </div>
            <WarehousesTable warehouses={warehouses || []} />
        </div>
    )
}