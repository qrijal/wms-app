import React, { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { FileDown, ScrollText, LayoutGrid } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import PalletPdfDocument from './PalletPdfDocument'

export default function PrintPalletModal({ data, onClose }: { data: any[], onClose: () => void }) {
  const [paperSize, setPaperSize] = useState<'THERMAL' | 'A4' | 'A5'>('THERMAL')
  const [pdfData, setPdfData] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(true)

  // Generate QR Code menjadi Data URL (Base64) agar bisa dibaca PDF
  useEffect(() => {
    const generateQRs = async () => {
      setIsGenerating(true)
      try {
        const processedData = await Promise.all(
          data.map(async (item) => {
            // Ubah teks palletId menjadi gambar QR base64
            const qrDataUrl = await QRCode.toDataURL(item.palletId, {
              errorCorrectionLevel: 'H',
              margin: 1,
              width: 300
            })
            return { ...item, qrDataUrl }
          })
        )
        setPdfData(processedData)
      } catch (error) {
        console.error("Gagal generate QR:", error)
      } finally {
        setIsGenerating(false)
      }
    }
    
    generateQRs()
  }, [data])

  return (
    <Modal onClose={onClose} title="Export Label PDF" className="w-[95vw] max-w-xl">
      <div className="p-6 space-y-8">
        
        {/* Area Pilih Kertas */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Pilih Ukuran Kertas</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPaperSize('THERMAL')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors border ${paperSize === 'THERMAL' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <ScrollText size={16} /> Thermal
            </button>
            <button
              onClick={() => setPaperSize('A4')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors border ${paperSize === 'A4' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <LayoutGrid size={16} /> A4
            </button>
          </div>
        </div>

        {/* Info & Tombol Download */}
        <div className="text-center space-y-6 pt-4">
          <div className="text-slate-500 text-sm">
            Terdapat <span className="font-bold text-slate-800">{data.length} Label</span> siap diexport ke format PDF berukuran {paperSize}.
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose} className="px-6">Batal</Button>
            
            {isGenerating ? (
              <Button disabled className="bg-slate-400 text-white px-8">
                Memproses QR Code...
              </Button>
            ) : (
              <PDFDownloadLink
                document={<PalletPdfDocument data={pdfData} paperSize={paperSize} />}
                fileName={`Label-Pallet-${new Date().getTime()}.pdf`}
                className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {/* Hapus properti ({ loading }) yang membingungkan linter, ganti langsung render */}
                <FileDown size={18} /> Download PDF
              </PDFDownloadLink>
            )}
          </div>
        </div>

      </div>
    </Modal>
  )
}