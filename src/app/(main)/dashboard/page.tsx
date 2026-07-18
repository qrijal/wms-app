'use client'
import { Calendar, TrendingUp, AlertTriangle, Info, Package, CheckCircle2 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Warehouse Overview</h1>
          <p className="text-slate-500 text-sm">Real-time logistics performance metrics</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Calendar size={16} />
          Oct 1, 2023 - Oct 31, 2023
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'TOTAL INBOUND', value: '1,284', trend: '+12%', color: 'text-emerald-600' },
          { label: 'TOTAL OUTBOUND', value: '942', trend: '-3% vs LW', color: 'text-slate-600' },
          { label: 'ACTIVE PICKERS', value: '24', detail: '85% Utilization', color: 'text-slate-800' },
          { label: 'INVENTORY ACCURACY', value: '99.2%', icon: CheckCircle2, color: 'text-emerald-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">{card.label}</p>
            <div className="flex justify-between items-end">
              <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
              {card.trend && <span className={`text-xs font-semibold ${card.color}`}>{card.trend}</span>}
              {card.icon && <card.icon size={20} className={card.color} />}
            </div>
            {card.detail && <p className="text-[10px] text-slate-400 mt-1">{card.detail}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Trends (Placeholder untuk Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800">Warehouse Activity Trends</h2>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg text-xs">
              <span className="px-3 py-1 bg-white shadow rounded-md font-semibold text-blue-600">Inbound</span>
              <span className="px-3 py-1 text-slate-500">Outbound</span>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
            [Area Chart Komponen Data Performa Mingguan]
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">Critical Stock Alerts</h2>
          <div className="space-y-4">
            {[
              { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', title: 'SKU-90210 Low', desc: '5 units remaining in Zone A' },
              { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Pending Transfer', desc: 'Gudang MKS → Gudang JKT' },
              { icon: Package, color: 'text-sky-600', bg: 'bg-sky-50', title: 'New Inbound Batch', desc: '12 pallets arriving at 14:00' },
            ].map((alert, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                <div className={`p-2 rounded-lg ${alert.bg}`}>
                  <alert.icon size={18} className={alert.color} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                  <p className="text-xs text-slate-500">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            View All Alerts
          </button>
        </div>
      </div>
    </div>
  )
}