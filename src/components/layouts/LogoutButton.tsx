'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }
  return <button onClick={logout} className="w-full text-left p-2 hover:bg-red-50 rounded text-red-600">Logout</button>
}