'use client'

import { useState, useMemo } from 'react'

type Entry = {
  id: string
  description: string | null
  start_time: string
  end_time: string | null
  duration: number | null
  billable: boolean
  projects: { name: string; color: string } | null
}
type Project = { id: string; name: string; color: string }

type Tab = 'summary' | 'weekly' | 'detailed'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function ReportsClient({ entries, projects }: { entries: Entry[]; projects: Project[] }) {
  const [tab, setTab] = useState<Tab>('summary')
  const [projectFilter, setProjectFilter] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date())
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    d.setHours(23, 59, 59, 999)
    return d
  }, [weekStart])

  const filtered = entries.filter(e => {
    if (projectFilter && e.projects?.name !== projectFilter) return false
    return true
  })

  const weekEntries = filtered.filter(e => {
    const d = new Date(e.start_time)
    return d >= weekStart && d <= weekEnd
  })

  const totalSeconds = filtered.reduce((s, e) => s + (e.duration ?? 0), 0)
  const billableSeconds = filtered.filter(e => e.billable).reduce((s, e) => s + (e.duration ?? 0), 0)

  // Summary: group by project
  const byProject = useMemo(() => {
    const map: Record<string, { name: string; color: string; seconds: number; billable: number }> = {}
    filtered.forEach(e => {
      const key = e.projects?.name ?? 'No project'
      if (!map[key]) map[key] = { name: key, color: e.projects?.color ?? '#94a3b8', seconds: 0, billable: 0 }
      map[key].seconds += e.duration ?? 0
      if (e.billable) map[key].billable += e.duration ?? 0
    })
    return Object.values(map).sort((a, b) => b.seconds - a.seconds)
  }, [filtered])

  // Weekly: hours per day this week
  const byDay = useMemo(() => {
    return DAYS.map((label, i) => {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + i)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)
      const seconds = weekEntries.filter(e => {
        const d = new Date(e.start_time)
        return d >= day && d <= dayEnd
      }).reduce((s, e) => s + (e.duration ?? 0), 0)
      return { label, date: day, seconds }
    })
  }, [weekStart, weekEntries])

  const maxDaySeconds = Math.max(...byDay.map(d => d.seconds), 1)

  const weekLabel = `${weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`

  function exportCSV() {
    const rows = [
      ['Date', 'Description', 'Project', 'Billable', 'Duration (h)'],
      ...filtered.map(e => [
        new Date(e.start_time).toLocaleDateString(),
        e.description ?? '',
        e.projects?.name ?? '',
        e.billable ? 'Yes' : 'No',
        ((e.duration ?? 0) / 3600).toFixed(2),
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'trackify-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPrint() {
    window.print()
  }

  return (
    <div className="max-w-4xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: '#f1f5f9' }}>
        {(['summary','weekly','detailed'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-md text-sm font-medium capitalize transition-colors"
            style={{ background: tab === t ? 'white' : 'transparent', color: tab === t ? '#0f172a' : '#64748b' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Filters + Export */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#e2e8f0', color: '#0f172a', background: 'white' }}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        {tab === 'weekly' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(o => o - 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>‹</button>
            <span className="text-sm" style={{ color: '#475569' }}>{weekLabel}</span>
            <button onClick={() => setWeekOffset(o => o + 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>›</button>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: '#e2e8f0', color: '#475569', background: 'white' }}>
            <i className="ti ti-download" style={{ fontSize: '15px' }} />
            Export CSV
          </button>
          <button onClick={exportPrint} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: '#e2e8f0', color: '#475569', background: 'white' }}>
            <i className="ti ti-printer" style={{ fontSize: '15px' }} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total time', value: formatDuration(totalSeconds) },
          { label: 'Billable time', value: formatDuration(billableSeconds) },
          { label: 'Entries', value: String(filtered.length) },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>{s.label}</p>
            <p className="text-2xl font-semibold" style={{ color: '#0f172a' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {byProject.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: '#94a3b8' }}>No data for selected filters.</div>
          ) : byProject.map((p, i) => {
            const pct = totalSeconds > 0 ? Math.round((p.seconds / totalSeconds) * 100) : 0
            return (
              <div key={p.name} className="px-5 py-4" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="flex-1 text-sm font-medium" style={{ color: '#0f172a' }}>{p.name}</span>
                  <span className="text-sm" style={{ color: '#64748b' }}>{pct}%</span>
                  <span className="text-sm font-mono font-medium w-20 text-right" style={{ color: '#0f172a' }}>{formatDuration(p.seconds)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Weekly tab */}
      {tab === 'weekly' && (
        <div className="rounded-xl border p-6" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <div className="flex items-end gap-3 h-48">
            {byDay.map(day => {
              const heightPct = day.seconds > 0 ? (day.seconds / maxDaySeconds) * 100 : 0
              const isToday = day.date.toDateString() === new Date().toDateString()
              return (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
                  {day.seconds > 0 && (
                    <span className="text-xs font-medium" style={{ color: '#64748b' }}>{formatDuration(day.seconds)}</span>
                  )}
                  <div className="w-full rounded-t-md transition-all" style={{
                    height: `${Math.max(heightPct, day.seconds > 0 ? 4 : 0)}%`,
                    background: isToday ? '#14b8a6' : '#cbd5e1',
                    minHeight: day.seconds > 0 ? '4px' : '0'
                  }} />
                  <span className="text-xs font-medium" style={{ color: isToday ? '#14b8a6' : '#94a3b8' }}>{day.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detailed tab */}
      {tab === 'detailed' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: '#94a3b8' }}>No entries found.</div>
          ) : filtered.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.projects?.color ?? '#94a3b8' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: entry.description ? '#0f172a' : '#94a3b8', fontStyle: entry.description ? 'normal' : 'italic' }}>
                  {entry.description || 'No description'}
                </p>
                {entry.projects && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{entry.projects.name}</p>}
              </div>
              {entry.billable && <span className="text-xs font-semibold" style={{ color: '#14b8a6' }}>$</span>}
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                {new Date(entry.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-sm font-mono font-medium w-20 text-right" style={{ color: '#334155' }}>
                {formatDuration(entry.duration ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
