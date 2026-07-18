// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/permissions'
import { createServiceClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  // 1. Ubah tipe data params menjadi Promise
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // Validasi permission
    await requireSuperadmin()
    
    // 2. Gunakan await untuk mengekstrak id dari params
    const { id } = await params 
    
    if (!id) {
      return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    
    // Ambil data yang dikirimkan dari form
    const { wh_id, full_name, role } = await request.json()

    if (!full_name || !wh_id || !role) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Lakukan update ke tabel dim_users
    const { data, error } = await supabase
      .from('dim_users')
      .update({
        wh_id: wh_id,
        full_name: full_name,
        role: role,
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error update user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 200 })
    
  } catch (error: any) {
    console.error('PUT /api/users/[id] error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}