export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4 text-lg font-bold">WMS Operator</header>
      <main className="p-4">{children}</main>
    </div>
  )
}