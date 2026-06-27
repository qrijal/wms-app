import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/permissions'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireSuperadmin()
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('dim_users')
      .select('id, email, full_name, role, wh_id, dim_warehouses(name)')
      .eq('role', 'admin')
      .order('full_name')

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperadmin()
    const supabase = await createServiceClient()
    const { email, password, full_name, wh_id } = await request.json()

    // Validasi
    if (!email || !password || !full_name || !wh_id) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }

    // Cek email sudah ada di dim_users
    const { data: existing } = await supabase
      .from('dim_users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    // Buat user auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Upsert ke dim_users (mencegah duplikat ID)
    const { error: upsertErr } = await supabase
      .from('dim_users')
      .upsert(
        {
          id: authUser.user.id,
          email,
          full_name,
          role: role || 'admin',   // gunakan role yang dikirim
          wh_id,
        },
        { onConflict: 'id' }
      )

    if (upsertErr) {
      // Rollback user auth jika gagal menyimpan profil
      await supabase.auth.admin.deleteUser(authUser.user.id)
      console.error('Gagal upsert dim_users:', upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}