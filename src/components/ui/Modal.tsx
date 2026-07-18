// @/components/ui/Modal.tsx
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  className?: string // Tambahkan prop ini jika belum ada
}

export default function Modal({ title, onClose, children, className = '' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
      {/* Gunakan w-[90vw] untuk 90% lebar viewport
        Gunakan max-h-[90vh] untuk 90% tinggi viewport
        flex flex-col memastikan header tetap di atas dan body bisa di-scroll
      */}
      <div className={`bg-white rounded-2xl shadow-xl w-[90vw] max-w-[1400px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${className}`}>
        
        {/* Header Tetap (Sticky) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Modal (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}