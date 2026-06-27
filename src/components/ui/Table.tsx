interface TableProps {
  columns: string[];
  data: any[][];
}

export default function Table({ columns, data }: TableProps) {
  return (
    <div className="overflow-x-auto border border-gray-300 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 border border-gray-300 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}