import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import { crNum } from '../lib/format'

// The vendored topology predates 2019's J&K/Ladakh split and 2020's Dadra & Nagar
// Haveli + Daman & Diu merger (see public/india-states.topo.json.LICENSE.md), so its
// NAME_1 values don't all match NPCI's current state names 1:1. This maps the
// topology's names to NPCI's - reverse of it (NPCI name -> topology name) is built
// below for looking up which polygon a given data row's state belongs to.
const TOPOLOGY_TO_NPCI: Record<string, string> = {
  'Andaman and Nicobar': 'ANDAMAN AND NICOBAR ISLANDS',
  Orissa: 'ODISHA',
  Uttaranchal: 'UTTARAKHAND',
  'Dadra and Nagar Haveli': 'DADRA & NAGAR HAVELI & DAMAN & DIU',
  'Daman and Diu': 'DADRA & NAGAR HAVELI & DAMAN & DIU',
}

function npciName(topologyName: string): string {
  return TOPOLOGY_TO_NPCI[topologyName] ?? topologyName.toUpperCase()
}

type StateFeature = { type: 'Feature'; properties: { NAME_1: string }; geometry: Geometry }

function useIndiaTopology() {
  return useQuery({
    queryKey: ['india-states-topology'],
    queryFn: async (): Promise<FeatureCollection> => {
      const res = await fetch(`${import.meta.env.BASE_URL}india-states.topo.json`)
      if (!res.ok) throw new Error(`Failed to load map topology: ${res.status}`)
      const topology = (await res.json()) as Topology
      const objectKey = Object.keys(topology.objects)[0]
      const geometries = topology.objects[objectKey] as GeometryCollection
      return feature(topology, geometries) as unknown as FeatureCollection
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

// Multi-stop "heat" ramps instead of a flat two-color fade - still sequential
// (monotonically brighter = higher share, so the encoding stays honest) but reads as
// far more colorful. Volume finishes warm (marigold/coral), Value finishes cool/fresh
// (blue/green), so the two metrics stay visually distinguishable at a glance.
const RAMP: Record<'volume' | 'value', string[]> = {
  volume: ['#0F1B2E', '#1D6E56', '#3FC1A8', '#F5A524', '#E8654F'],
  value: ['#0F1B2E', '#1D3E7A', '#5B8DEF', '#3FC1A8', '#5FD97A'],
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function multiLerp(stops: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const scaled = clamped * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(scaled))
  const localT = scaled - i
  const [ar, ag, ab] = hexToRgb(stops[i])
  const [br, bg, bb] = hexToRgb(stops[i + 1])
  const r = Math.round(ar + (br - ar) * localT)
  const g = Math.round(ag + (bg - ag) * localT)
  const bl = Math.round(ab + (bb - ab) * localT)
  return `rgb(${r},${g},${bl})`
}

export function IndiaMap({
  rows,
  metric,
  selectedState,
  onStateClick,
  clickable,
}: {
  rows: { state: string; vol: number; val: number }[]
  metric: 'volume' | 'value'
  selectedState?: string | null
  onStateClick?: (state: string) => void
  clickable?: boolean
}) {
  const topology = useIndiaTopology()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; name: string; vol: number; val: number } | null>(null)

  // Aggregate incoming rows (district-level in some months, state-level in others) up
  // to one total per state, keyed by NPCI's own state name - independent of the
  // month's native granularity, so the map always shows one figure per state.
  const byState = useMemo(() => {
    const m = new Map<string, { vol: number; val: number }>()
    for (const r of rows) {
      const key = r.state.trim().toUpperCase()
      if (key === 'UNCLASSIFIED') continue
      const entry = m.get(key) ?? { vol: 0, val: 0 }
      entry.vol += r.vol
      entry.val += r.val
      m.set(key, entry)
    }
    return m
  }, [rows])

  const maxShare = useMemo(() => {
    let max = 0
    for (const v of byState.values()) max = Math.max(max, metric === 'volume' ? v.vol : v.val)
    return max || 1
  }, [byState, metric])

  const width = 400
  const height = 420

  const { path, features } = useMemo(() => {
    if (!topology.data) return { path: null, features: [] as StateFeature[] }
    const fc = topology.data
    const projection = geoMercator().fitExtent(
      [
        [34, 22],
        [366, 388],
      ],
      fc,
    )
    return { path: geoPath(projection), features: fc.features as unknown as StateFeature[] }
  }, [topology.data])

  if (topology.isPending) return <p className="section-note">Loading map…</p>
  if (topology.error || !path) return <p className="section-note">Map unavailable — showing table only.</p>

  const stops = RAMP[metric]

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Choropleth map of India shaded by ${metric} share per state${clickable ? '; click a state to see its districts' : ''}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <radialGradient id="ocean" cx="42%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#12233A" />
            <stop offset="100%" stopColor="#0A1522" />
          </radialGradient>
          <filter id="mapLift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        <rect x={0} y={0} width={width} height={height} fill="url(#ocean)" rx={12} />
        <text x={54} y={230} fontSize={9.5} letterSpacing="1.5" fill="var(--text-muted)" opacity={0.55} transform="rotate(-72 54 230)">
          ARABIAN SEA
        </text>
        <text x={352} y={250} fontSize={9.5} letterSpacing="1.5" fill="var(--text-muted)" opacity={0.55} transform="rotate(70 352 250)">
          BAY OF BENGAL
        </text>
        <text x={200} y={404} fontSize={9.5} letterSpacing="1.5" fill="var(--text-muted)" opacity={0.55} textAnchor="middle">
          INDIAN OCEAN
        </text>

        <g filter="url(#mapLift)">
          {features.map((f) => {
            const key = npciName(f.properties.NAME_1)
            const entry = byState.get(key)
            const share = entry ? (metric === 'volume' ? entry.vol : entry.val) : 0
            const t = entry ? Math.sqrt(share / maxShare) : 0
            const fill = entry ? multiLerp(stops, t) : '#1A2436'
            const d = path(f as never) ?? ''
            const isSelected = selectedState === key
            const isDimmed = (hover && hover.name !== key) || (selectedState && !isSelected)
            return (
              <path
                key={f.properties.NAME_1}
                d={d}
                fill={fill}
                stroke={isSelected ? '#FFFFFF' : 'var(--bg)'}
                strokeWidth={isSelected ? 2 : 0.75}
                style={{
                  cursor: entry && clickable ? 'pointer' : entry ? 'default' : 'not-allowed',
                  transition: 'opacity 0.15s ease, stroke-width 0.15s ease',
                }}
                opacity={isDimmed ? 0.5 : 1}
                onMouseMove={(e) => {
                  if (!entry || !wrapRef.current) return
                  const rect = wrapRef.current.getBoundingClientRect()
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, name: key, vol: entry.vol, val: entry.val })
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  if (!entry || !clickable) return
                  setHover(null)
                  onStateClick?.(key)
                }}
              />
            )
          })}
        </g>
      </svg>
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hover.x + 12, width - 170),
            top: Math.max(hover.y - 12, 0),
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12.5,
            pointerEvents: 'none',
            boxShadow: '0 8px 20px -8px rgba(0,0,0,0.6)',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>{hover.name.toLowerCase()}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Volume share: {crNum(hover.vol)}%</div>
          <div style={{ color: 'var(--text-secondary)' }}>Value share: {crNum(hover.val)}%</div>
          {clickable && <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 11 }}>Click for districts</div>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
        <span>Lower share</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${stops.join(',')})` }} />
        <span>Higher share</span>
      </div>
    </div>
  )
}
