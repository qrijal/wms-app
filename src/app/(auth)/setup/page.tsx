'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSetupNeeded, setIsSetupNeeded] = useState<boolean | null>(null) // null = loading
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/check-setup')
        if (!res.ok) {
          // Jika error, asumsikan setup tidak diperlukan (redirect aman)
          router.replace('/login')
          return
        }
        const data = await res.json()
        if (!data.setupNeeded) {
          router.replace('/login')
        } else {
          setIsSetupNeeded(true)
        }
      } catch {
        router.replace('/login')
      }
    })()
  }, [router])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (secretKey !== process.env.NEXT_PUBLIC_SETUP_SECRET_KEY) {
      setError('Kunci setup tidak valid')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, secretKey }),
      })
      const contentType = res.headers.get('content-type')
      let data: any = {}
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      } else {
        throw new Error('Respons server tidak valid')
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat akun superadmin')
      }

      // Login otomatis
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) {
        setError('Akun dibuat tetapi gagal login: ' + loginErr.message)
      } else {
        router.push('/superadmin/companies')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  // Tampilkan loading saat mengecek
  if (isSetupNeeded === null) {
    return <div className="flex min-h-screen items-center justify-center">Memeriksa...</div>
  }

  if (!isSetupNeeded) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSetup} className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4">Setup Superadmin</h1>
        <p className="text-sm text-gray-500 mb-6">Buat akun superadmin pertama. Hanya bisa dilakukan sekali.</p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        <div className="mb-3">
          <label className="block text-sm font-medium">Nama Lengkap</label>
          <input className="w-full p-2 border rounded" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium">Email</label>
          <input type="email" className="w-full p-2 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium">Password</label>
          <input type="password" className="w-full p-2 border rounded" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Setup Secret Key</label>
          <input type="password" className="w-full p-2 border rounded" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Menyiapkan...' : 'Buat Akun Superadmin'}
        </button>
      </form>
    </div>
  )
}