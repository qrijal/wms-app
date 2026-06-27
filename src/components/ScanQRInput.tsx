// components/ScanQRInput.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import Alert from '@/components/ui/Alert'

interface ScanQRInputProps {
  onScan: (code: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function ScanQRInput({ onScan, placeholder, disabled }: ScanQRInputProps) {
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [error, setError] = useState('')
  const [inputValue, setInputValue] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)

  // Cleanup saat komponen unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // abaikan error saat stop
      }
      scannerRef.current = null
    }
    setCameraActive(false)
  }

  const startCamera = async () => {
    setError('')
    setCameraStarting(true)

    // Tunggu satu frame agar div#qr-reader sudah ada di DOM sebelum diinisialisasi
    await new Promise((resolve) => requestAnimationFrame(resolve))

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
          stopCamera()
        },
        () => {}
      )

      setCameraActive(true)
    } catch (err: any) {
      console.error('Camera error:', err)
      if (err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError') {
        setError('Izin kamera ditolak. Silakan aktifkan kamera atau ketik manual.')
      } else if (err?.message?.includes('NotFoundError')) {
        setError('Kamera tidak ditemukan pada perangkat ini.')
      } else {
        setError('Tidak dapat mengakses kamera. Gunakan input manual.')
      }
      setCameraActive(false)
    } finally {
      setCameraStarting(false)
    }
  }

  const toggleCamera = () => {
    if (cameraActive || cameraStarting) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = inputValue.trim()
      if (val) {
        onScan(val)
        setInputValue('')
      }
    }
  }

  const handleManualSubmit = () => {
    const val = inputValue.trim()
    if (val) {
      onScan(val)
      setInputValue('')
      manualInputRef.current?.focus()
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Input dengan tombol scan di dalam */}
      <div className="relative flex items-center">
        <input
          ref={manualInputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleManualKeyDown}
          className="w-full p-4 pr-28 text-lg border-2 rounded-lg focus:border-blue-500 outline-none disabled:opacity-50"
          placeholder={placeholder || 'Ketik product_code lalu Enter...'}
          disabled={disabled}
          autoComplete="off"
        />
        <div className="absolute right-2 flex gap-1">
          {/* Tombol submit manual */}
          {inputValue.trim() && (
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={disabled}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              title="Kirim"
            >
              ↵
            </button>
          )}
          {/* Tombol toggle kamera */}
          <button
            type="button"
            onClick={toggleCamera}
            disabled={disabled || cameraStarting}
            className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 disabled:opacity-50 ${
              cameraActive
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={cameraActive ? 'Matikan Kamera' : 'Scan Kamera'}
          >
            {cameraStarting ? (
              <span className="animate-spin">⟳</span>
            ) : cameraActive ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Area kamera — SELALU ada di DOM, visibility dikontrol CSS agar qr-reader selalu tersedia */}
      <div style={{ display: cameraActive || cameraStarting ? 'block' : 'none' }}>
        <div className="rounded-lg overflow-hidden border-2 border-blue-300">
          <div id="qr-reader" className="w-full" />
          {cameraStarting && (
            <p className="text-sm text-gray-500 text-center py-2">Memulai kamera...</p>
          )}
        </div>
      </div>
    </div>
  )
}
