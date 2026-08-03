type Column<T> = {
  header: string
  align?: 'left' | 'right'
  render: (row: T, index: number) => React.ReactNode
}

export function RankedTable<T>({
  rows,
  columns,
  rowKey,
  showRank = true,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  showRank?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
            {showRank && <th className="px-6 py-3 font-medium">#</th>}
            {columns.map((col) => (
              <th
                key={col.header}
                className={`px-6 py-3 font-medium ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row)} className="border-b border-[var(--border)] last:border-0">
              {showRank && <td className="px-6 py-3 text-[var(--text-muted)]">{i + 1}</td>}
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-6 py-3 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
