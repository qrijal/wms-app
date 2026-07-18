interface TableProps {
  columns: string[];
  data: any[][];
}

export default function Table({ columns, data }: TableProps) {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col, index) => (
                <th 
                  key={index} 
                  className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((row, i) => (
                <tr 
                  key={i} 
                  className="hover:bg-slate-50/80 transition-colors duration-150 group"
                >
                  {row.map((cell, j) => (
                    <td 
                      key={j} 
                      className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap group-hover:text-slate-900"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-8 text-center text-sm text-slate-400 italic"
                >
                  Tidak ada data yang tersedia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}