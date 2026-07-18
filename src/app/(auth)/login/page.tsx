'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Warehouse } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data?.user) throw new Error('Login gagal, user kosong')

      const { data: profile, error: profileError } = await supabase
        .from('dim_users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) {
        await supabase.auth.signOut()
        throw new Error('Akun tidak memiliki profil. Hubungi administrator.')
      }

      if (profile.role === 'superadmin' || profile.role === 'admin') {
        router.push('/dashboard')
      } else if (profile.role === 'operator') {
        router.push('/operator/inbound')
      } else {
        setError('Role tidak dikenali')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      {/* Container Utama */}
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl min-h-[600px]">
        
        {/* Panel Kiri (Visual) */}
        <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden">
          {/* Background Image Placeholder */}
          <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: 'url("/warehouse-bg.jpg")' }}></div>
          <div className="absolute inset-0 bg-blue-900/40"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center text-white">
            <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl border border-white/30 shadow-xl">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-600 rounded-xl">
                  <Warehouse size={40} className="text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4">Streamlined Logistics</h2>
              <p className="text-blue-50 text-sm leading-relaxed">
                Experience unparalleled precision and operational speed with our next-generation warehouse management system.
              </p>
            </div>
          </div>
        </div>

        {/* Panel Kanan (Form) */}
        <div className="w-full lg:w-1/2 p-12 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-12">
              <Warehouse className="text-blue-600" size={28} />
              <span className="text-xl font-bold text-slate-800">WMS Qom</span>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
              <p className="text-slate-500">Please enter your credentials to access your dashboard.</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Footer Options */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  Remember Me
                </label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:underline">Forgot Password?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-semibold"
              >
                {loading ? 'Processing...' : (
                  <>
                    Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Copyright */}
          <div className="mt-8 text-center text-xs text-slate-400">
            <p>© 2024 WMS Qom Logistics Core. All rights reserved.</p>
            <div className="mt-1 space-x-2">
              <a href="#" className="hover:text-blue-600">Privacy Policy</a>
              <span>·</span>
              <a href="#" className="hover:text-blue-600">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}