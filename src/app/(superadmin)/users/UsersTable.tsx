'use client'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import EditUserModal from './EditUserModal'

interface UsersTableProps {
  users: any[]
  warehouses: any[]
}

export default function UsersTable({ users, warehouses }: UsersTableProps) {
  const [editingUser, setEditingUser] = useState<any | null>(null)

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8faff] border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Warehouse</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                  {user.full_name || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.email || '-'}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e6efff] text-blue-600">
                    {user.role || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.dim_warehouses?.name || '-'}
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => setEditingUser(user)}
                    className="text-blue-500 hover:text-blue-700 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                    title="Edit User"
                  >
                    <Pencil size={18} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                  Belum ada data user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal 
          user={editingUser} 
          warehouses={warehouses} 
          onClose={() => setEditingUser(null)} 
        />
      )}
    </div>
  )
}