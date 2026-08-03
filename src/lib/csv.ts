function csvEsc(s: unknown): string {
  const str = String(s ?? '')
  return str.includes(',') || str.includes('"') ? '"' + str.replace(/"/g, '""') + '"' : str
}

export function downloadCSV(filename: string, rows: unknown[][]): void {
  const csv = rows.map((r) => r.map(csvEsc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
