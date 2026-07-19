import React from 'react'
import QRCode from 'react-qr-code'

export interface PalletPrintData {
  palletId: string
  productCode: string
  productName: string
  batch: string
}

interface PalletLabelProps {
  data: PalletPrintData
  paperSize: 'THERMAL' | 'A4' | 'A5'
}

export default function PalletLabel({ data, paperSize }: PalletLabelProps) {
  const isThermal = paperSize === 'THERMAL'
  
  return (
    <div className={`flex flex-col bg-white print:border-none print:rounded-none
      ${isThermal 
        ? 'w-full h-full p-2' // h-full agar memenuhi parent 149mm
        : 'w-full aspect-[4/3] p-4 justify-between border border-slate-300 rounded-xl'
      }
    `}>
      
      {/* 1. HEADER (Otomatis diam di atas) */}
      <div className="text-center border-b-2 border-slate-800 print:border-black pb-2">
        <h2 className={`font-black text-slate-800 print:text-black tracking-widest ${isThermal ? 'text-2xl' : 'text-lg'}`}>
          PALLET ID
        </h2>
      </div>

      {/* 2. AREA QR CODE (flex-1 akan menyerap semua sisa ruang kosong di tengah) */}
      <div className="flex-1 flex flex-col justify-center items-center w-full">
        <QRCode 
          value={data.palletId} 
          size={isThermal ? 240 : 120} // Ukuran QR diperbesar maksimal untuk Thermal
          level="H" 
        />
        <p className={`font-mono font-black text-slate-900 print:text-black mt-4 ${isThermal ? 'text-4xl' : 'text-xl'}`}>
          {data.palletId}
        </p>
      </div>

      {/* 3. FOOTER / DETAILS (Otomatis terdorong ke paling bawah) */}
      <div className={`grid grid-cols-2 gap-2 text-slate-800 print:text-black w-full border-t-2 border-slate-800 print:border-black pt-2 ${isThermal ? 'text-base' : 'text-xs'}`}>
        <div className="col-span-2">
          <span className="block text-slate-500 print:text-gray-800 text-[11px] uppercase font-bold tracking-wider">Deskripsi Produk</span>
          <span className="font-bold line-clamp-2 leading-tight">{data.productName}</span>
        </div>
        <div>
          <span className="block text-slate-500 print:text-gray-800 text-[11px] uppercase font-bold tracking-wider">Kode Produk</span>
          <span className="font-bold font-mono">{data.productCode}</span>
        </div>
        <div>
          <span className="block text-slate-500 print:text-gray-800 text-[11px] uppercase font-bold tracking-wider">Batch</span>
          <span className="font-bold font-mono">{data.batch}</span>
        </div>
      </div>

    </div>
  )
}