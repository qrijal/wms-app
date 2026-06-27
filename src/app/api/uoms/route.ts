// src/app/api/uoms/route.ts

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

async function getAdminCompanyId(
  supabase: any,
  whId: number
) {
  const { data, error } = await supabase
    .from('dim_warehouses')
    .select(`
      branch_id,
      dim_branch (
        company_id
      )
    `)
    .eq('id', whId)
    .single()

  if (error) throw error

  const branchData = Array.isArray(data?.dim_branch)
    ? data.dim_branch[0]
    : data?.dim_branch

  return branchData?.company_id || null
}

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile()
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const companyIdParam = searchParams.get('company_id')

    let result: any[] = []

    // =========================================================
    // SUPERADMIN
    // =========================================================
    if (profile.role === 'superadmin') {

      let query = supabase
        .from('dim_product_uom')
        .select(`
          id,
          name,
          conversion_factor,
          company_id,
          is_primary,
          base_uom_id,
          primary_uom:base_uom_id (
            name
          ),
          dim_company (
            name
          )
        `)
        .eq('is_primary', false)
        .not('base_uom_id', 'is', null)
        .order('name')

      // filter company_id jika ada parameter
      if (companyIdParam) {
        query = query.eq(
          'company_id',
          Number(companyIdParam)
        )
      }

      const { data, error } = await query

      if (error) throw error

      result = data || []
    }

    // =========================================================
    // ADMIN
    // =========================================================
    else if (profile.role === 'admin') {

      const adminCompanyId = await getAdminCompanyId(
        supabase,
        profile.wh_id
      )

      const baseQuery = () =>
        supabase
          .from('dim_product_uom')
          .select(`
            id,
            name,
            conversion_factor,
            company_id,
            is_primary,
            base_uom_id,
            primary_uom:base_uom_id (
              name
            ),
            dim_company (
              name
            )
          `)
          .eq('is_primary', false)
          .not('base_uom_id', 'is', null)
          .order('name')

      let merged: any[] = []

      // admin punya company
      if (adminCompanyId) {

        const [
          { data: companyUom, error: err1 },
          { data: globalUom, error: err2 }
        ] = await Promise.all([
          baseQuery().eq('company_id', adminCompanyId),
          baseQuery().is('company_id', null)
        ])

        if (err1 || err2) {
          throw err1 || err2
        }

        merged = [
          ...(companyUom || []),
          ...(globalUom || [])
        ]
      }

      // admin tanpa company
      else {

        const { data, error } = await baseQuery()
          .is('company_id', null)

        if (error) throw error

        merged = data || []
      }

      // remove duplicate
      result = merged.filter(
        (item, index, self) =>
          index === self.findIndex(
            t => t.id === item.id
          )
      )
    }

    // =========================================================
    // FORMAT RESPONSE
    // =========================================================
    const pairs = result.map((item: any) => ({
      id: item.id,
      secondary_name: item.name,
      conversion_factor: item.conversion_factor,
      primary_name:
        item.primary_uom?.name || 'Unknown',
      primary_id: item.base_uom_id,
      company_name:
        item.dim_company?.name || 'Global',
    }))

    return NextResponse.json(pairs)

  } catch (e: any) {

    console.error('UOM GET ERROR:', e)

    return NextResponse.json(
      {
        error: e.message || 'Failed load UOM'
      },
      {
        status: 403
      }
    )
  }
}

export async function POST(request: Request) {
  try {

    const profile = await getUserProfile()
    const supabase = await createClient()

    const {
      primary_name,
      secondary_name,
      conversion_factor,
      company_id
    } = await request.json()

    // =========================================================
    // VALIDATION
    // =========================================================
    if (
      !primary_name ||
      !secondary_name ||
      conversion_factor === undefined ||
      conversion_factor === ''
    ) {
      return NextResponse.json(
        {
          error: 'Semua field harus diisi'
        },
        {
          status: 400
        }
      )
    }

    const factorNum = Number(conversion_factor)

    if (
      isNaN(factorNum) ||
      factorNum <= 0
    ) {
      return NextResponse.json(
        {
          error:
            'Faktor konversi harus berupa angka positif'
        },
        {
          status: 400
        }
      )
    }

    // =========================================================
    // COMPANY ID
    // =========================================================
    let finalCompanyId: number | null =
      company_id || null

    // admin hanya boleh pakai company miliknya
    if (profile.role === 'admin') {

      finalCompanyId =
        await getAdminCompanyId(
          supabase,
          profile.wh_id
        )
    }

    // =========================================================
    // FIND PRIMARY UOM
    // =========================================================
    let primaryUom: {
      id: number
    } | null = null

    const {
      data: existingPrimary,
      error: primaryQueryError
    } = await supabase
      .from('dim_product_uom')
      .select('id')
      .eq('name', primary_name)
      .eq('is_primary', true)
      .eq('company_id', finalCompanyId)
      .maybeSingle()

    if (primaryQueryError) {
      throw primaryQueryError
    }

    // =========================================================
    // CREATE PRIMARY UOM
    // =========================================================
    if (existingPrimary) {

      primaryUom = existingPrimary

    } else {

      const {
        data: newPrimary,
        error: createPrimaryError
      } = await supabase
        .from('dim_product_uom')
        .insert({
          name: primary_name,
          is_primary: true,
          company_id: finalCompanyId,
        })
        .select('id')
        .single()

      if (createPrimaryError) {
        throw createPrimaryError
      }

      primaryUom = newPrimary
    }

    // =========================================================
    // CREATE SECONDARY UOM
    // =========================================================
    const {
      data: secondaryUom,
      error: secondaryError
    } = await supabase
      .from('dim_product_uom')
      .insert({
        name: secondary_name,
        is_primary: false,
        base_uom_id: primaryUom!.id,
        conversion_factor: factorNum,
        company_id: finalCompanyId,
      })
      .select(`
        *,
        primary_uom:base_uom_id (
          name
        )
      `)
      .single()

    // rollback primary jika secondary gagal
    if (secondaryError) {

      if (!existingPrimary) {

        await supabase
          .from('dim_product_uom')
          .delete()
          .eq('id', primaryUom!.id)
      }

      throw secondaryError
    }

    return NextResponse.json(
      secondaryUom,
      {
        status: 201
      }
    )

  } catch (e: any) {

    console.error('UOM POST ERROR:', e)

    return NextResponse.json(
      {
        error:
          e.message || 'Failed create UOM'
      },
      {
        status: 400
      }
    )
  }
}