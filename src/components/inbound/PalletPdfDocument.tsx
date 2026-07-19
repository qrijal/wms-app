import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// 1 mm = 2.8346 points. Jadi 100x150mm = [283.5, 425.2]
const THERMAL_SIZE = [283.5, 425.2] as const

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 15,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'extrabold',
    letterSpacing: 2,
  },
  qrSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  palletIdText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    fontFamily: 'Courier-Bold', // Font monospace bawaan PDF
  },
  footer: {
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colFull: { width: '100%', marginBottom: 10 },
  colHalf: { width: '50%' },
  label: { fontSize: 8, color: '#475569', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 11, fontWeight: 'bold' },
})

export default function PalletPdfDocument({ data, paperSize }: { data: any[], paperSize: string }) {
  // Sementara kita setel agar semua ukuran mencetak 1 label per halaman (seperti Thermal)
  // Anda bisa mengembangkan grid layout untuk A4 nanti jika dibutuhkan.
  const pageSize = paperSize === 'THERMAL' ? THERMAL_SIZE : paperSize === 'A4' ? 'A4' : 'A5'

  return (
    <Document>
      {data.map((item, idx) => (
        <Page key={idx} size={pageSize} style={styles.page}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerText}>PALLET ID</Text>
          </View>

          {/* QR CODE & PALLET ID */}
          <View style={styles.qrSection}>
            {item.qrDataUrl && <Image src={item.qrDataUrl} style={styles.qrImage} />}
            <Text style={styles.palletIdText}>{item.palletId}</Text>
          </View>

          {/* DETAILS */}
          <View style={styles.footer}>
            <View style={styles.colFull}>
              <Text style={styles.label}>Deskripsi Produk</Text>
              <Text style={styles.value}>{item.productName}</Text>
            </View>
            <View style={styles.colHalf}>
              <Text style={styles.label}>Kode Produk</Text>
              <Text style={styles.value}>{item.productCode}</Text>
            </View>
            <View style={styles.colHalf}>
              <Text style={styles.label}>Batch</Text>
              <Text style={styles.value}>{item.batch}</Text>
            </View>
          </View>

        </Page>
      ))}
    </Document>
  )
}