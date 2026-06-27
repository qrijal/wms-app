'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OperatorTopBar() {
  const pathname = usePathname()
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isHome = pathname === '/operator'

  return (
    <header className="bg-red-600 text-white shadow sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Tombol Back – hanya jika bukan di halaman utama */}
          {!isHome && (
            <button
              onClick={() => router.push('/operator')}
              className="p-1 rounded hover:bg-red-700 transition-colors"
              title="Kembali ke Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="font-bold text-lg">WMS Mobile</h1>
          
        </div>
        <button onClick={handleLogout} className="text-sm hover:underline">
          Logout
        </button>
      </div>
    </header>
  )
}