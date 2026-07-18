'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'

// Sub-komponen agar tombol submit bisa melacak status loading
function CancelSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm('Apakah Anda yakin ingin membatalkan inbound ini?')) {
          e.preventDefault()
        }
      }}
      className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Membatalkan...' : 'Cancel'}
    </button>
  )
}

interface InboundActionMenuProps {
  id: string
  status: string
  cancelAction: (formData: FormData) => void
}

export default function InboundActionMenu({ id, status, cancelAction }: InboundActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Menutup dropdown otomatis jika user mengklik area luar menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Tombol Titik Tiga */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors focus:outline-none"
        title="Opsi"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {/* Area Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-100 rounded-lg shadow-lg z-50 py-1">
          {/* Link Edit (Disiapkan untuk nanti) */}
          <Link
            href={`/inbound/${id}/edit`}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>

          {/* Form Cancel hanya muncul jika status masih DRAFT */}
          {status === 'DRAFT' && (
            <form action={cancelAction} onSubmit={() => setIsOpen(false)}>
              <input type="hidden" name="id" value={id} />
              <CancelSubmitButton />
            </form>
          )}
        </div>
      )}
    </div>
  )
}