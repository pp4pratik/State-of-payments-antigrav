export function formatVolume(mn: number): string {
  if (mn >= 1000) return `${(mn / 1000).toFixed(2)}B`
  return `${mn.toFixed(1)}M`
}

export function formatValueCr(cr: number): string {
  // 1 lakh crore = 100,000 crore
  return `₹${(cr / 100000).toFixed(2)}L Cr`
}

export function formatMonth(iso: string): string {
  const [y, m] = iso.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  })
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-IN')
}
