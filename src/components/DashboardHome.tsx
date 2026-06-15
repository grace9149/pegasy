'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Entry = { id: string; description: string | null; start_time: string; end_time: string | null; duration: number | null; billable: boolean; projects: { name: string; color: string } | null }
type TopProject = { id: string; name: string; color: string; seconds: number; hourly_rate: number | null }

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}h ${m}m`
}

function formatDurationLong(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function greeting(email: string) {
  const hour = new Date().getHours()
  const name = email.split('@')[0]
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

export default function DashboardHome({
  userId, userEmail, todaySeconds, weekSeconds, monthSeconds, billableWeekSeconds,
  recentEntries, topProjects, runningEntry
}: {
  userId: string
  userEmail: string
  todaySeconds: number
  weekSeconds: number
  monthSeconds: number
  billableWeekSeconds: number
  recentEntries: Entry[]
  topProjects: TopProject[]
  runningEntry: Entry | null
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!runningEntry) return
    const calc = () => setElapsed(Math.floor((Date.now() - new Date(runningEntry.start_time).getTime()) / 1000))
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [runningEntry])

  const weekBillablePct = weekSeconds > 0 ? Math.round((billableWeekSeconds / weekSeconds) * 100) : 0
  const maxProjectSeconds = Math.max(...topProjects.map(p => p.seconds), 1)

  const statCards = [
    { label: "Today", value: formatDuration(todaySeconds), icon: 'ti-sun', color: '#f59e0b' },
    { label: "This week", value: formatDuration(weekSeconds), icon: 'ti-calendar-week', color: '#14b8a6' },
    { label: "This month", value: formatDuration(monthSeconds), icon: 'ti-calendar-month', color: '#3b82f6' },
    { label: "Billable this week", value: `${weekBillablePct}%`, icon: 'ti-currency-dollar', color: '#10b981' },
  ]

  return (
    <div className="max-w-5xl space-y-7">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#0f172a' }}>{greeting(userEmail)}</h2>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Running timer banner */}
      {runningEntry && (
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#0f172a' }}>
          <div className="w-3 h-3 rounded-full animate-pulse flex-shrink-0" style={{ background: '#14b8a6' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{runningEntry.description || 'No description'}</p>
            {runningEntry.projects && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{runningEntry.projects.name}</p>}
          </div>
          <div className="font-mono text-lg font-bold flex-shrink-0" style={{ color: '#14b8a6' }}>
            {formatDuration(elapsed)}
          </div>
          <Link href="/dashboard" className="px-4 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0" style={{ background: '#14b8a6', color: 'white' }}>
            Go to tracker
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(card => (
          <div key={card.label} className="rounded-xl p-5 border" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}18` }}>
                <i className={`ti ${card.icon}`} style={{ color: card.color, fontSize: '17px' }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{card.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Top projects */}
        <div className="col-span-3 rounded-xl border p-5" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Top projects this week</h3>
            <Link href="/dashboard/projects" className="text-xs font-medium" style={{ color: '#14b8a6' }}>View all</Link>
          </div>
          {topProjects.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>No time tracked this week.</div>
          ) : (
            <div className="space-y-4">
              {topProjects.map(p => {
                const pct = Math.round((p.seconds / maxProjectSeconds) * 100)
                return (
                  <div key={p.id}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: '#0f172a' }}>{p.name}</span>
                      <span className="text-sm font-mono" style={{ color: '#64748b' }}>{formatDurationLong(p.seconds)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden ml-5" style={{ background: '#f1f5f9' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="col-span-2 rounded-xl border p-5" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#0f172a' }}>Quick actions</h3>
          <div className="space-y-2">
            {[
              { href: '/dashboard', icon: 'ti-player-play', label: 'Track time', desc: 'Start a new timer' },
              { href: '/dashboard/reports', icon: 'ti-chart-bar', label: 'View reports', desc: 'Summary & exports' },
              { href: '/dashboard/invoices', icon: 'ti-file-invoice', label: 'Invoices', desc: 'Generate & send' },
              { href: '/dashboard/time-off', icon: 'ti-beach', label: 'Time off', desc: 'Requests & balances' },
            ].map(a => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group" style={{ background: '#f8fafc' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#e2e8f0' }}>
                  <i className={`ti ${a.icon}`} style={{ color: '#14b8a6', fontSize: '16px' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{a.label}</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>{a.desc}</p>
                </div>
                <i className="ti ti-chevron-right ml-auto" style={{ color: '#cbd5e1', fontSize: '14px' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent entries */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          <h3 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Recent entries</h3>
          <Link href="/dashboard" className="text-xs font-medium" style={{ color: '#14b8a6' }}>View all</Link>
        </div>
        {recentEntries.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: '#94a3b8', background: 'white' }}>No entries yet. Start tracking!</div>
        ) : recentEntries.map((entry, i) => (
          <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.projects?.color ?? '#cbd5e1' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: entry.description ? '#0f172a' : '#94a3b8', fontStyle: entry.description ? 'normal' : 'italic' }}>
                {entry.description || 'No description'}
              </p>
              {entry.projects && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{entry.projects.name}</p>}
            </div>
            {entry.billable && <span className="text-xs font-bold" style={{ color: '#14b8a6' }}>$</span>}
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              {new Date(entry.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-sm font-mono w-16 text-right" style={{ color: '#475569' }}>
              {formatDuration(entry.duration ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
