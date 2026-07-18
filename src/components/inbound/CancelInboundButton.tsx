'use client'

import { useFormStatus } from 'react-dom'

export default function CancelInboundButton() {
  // useFormStatus akan mendeteksi proses Server Action yang sedang berjalan
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm('Apakah Anda yakin ingin membatalkan dokumen inbound ini?')) {
          e.preventDefault() // Batalkan submit jika user klik 'Cancel' di dialog
        }
      }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors px-2.5 py-1 rounded-md hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'canceling...' : 'cancel'}
    </button>
  )
}