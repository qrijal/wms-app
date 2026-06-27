// src/app/operator/page.tsx
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTruckLoading, faShippingFast } from '@fortawesome/free-solid-svg-icons'

export default function OperatorPage() {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Card Inbound */}
        <Link
          href="/operator/inbound"
          className="group bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center gap-3"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <FontAwesomeIcon icon={faTruckLoading} className="w-8 h-8 text-blue-600" />
          </div>
          <span className="text-lg font-semibold text-gray-800">Inbound</span>
        </Link>

        {/* Card Outbound */}
        <Link
          href="/operator/outbound"
          className="group bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all duration-200 flex flex-col items-center justify-center gap-3"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
            <FontAwesomeIcon icon={faShippingFast} className="w-8 h-8 text-green-600" />
          </div>
          <span className="text-lg font-semibold text-gray-800">Outbound</span>
        </Link>
        <Link
          href="/operator/transfer"
          className="group bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all duration-200 flex flex-col items-center justify-center gap-3"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <FontAwesomeIcon icon={faShippingFast} className="w-8 h-8 text-purple-600" />
          </div>
          <span className="text-lg font-semibold text-gray-800">Transfer</span>
        </Link>
      </div>
    </div>
  )
}