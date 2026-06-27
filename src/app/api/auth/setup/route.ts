import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, password, fullName, secretKey } = await request.json()

    if (secretKey !== process.env.NEXT_PUBLIC_SETUP_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceClient()

    // Cek apakah sudah ada superadmin
    const { count, error: countErr } = await supabase
      .from('dim_users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'superadmin')
    if (countErr) {
      return NextResponse.json({ error: 'Gagal memeriksa data: ' + countErr.message }, { status: 500 })
    }
    if (count && count > 0) {
      return NextResponse.json({ error: 'Superadmin sudah ada' }, { status: 400 })
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

    // Insert ke dim_users
    // 5. Insert ke dim_users (dengan upsert untuk menghindari duplicate key)
    const { error: upsertErr } = await supabase
      .from('dim_users')
      .upsert(
        {
          id: authUser.user.id,
          email,
          full_name: fullName,
          role: 'superadmin',
          wh_id: null,
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (upsertErr) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Gagal menyimpan profil: ' + upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}