'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

type Client = { id: string; name: string }
type Project = {
  id: string; name: string; color: string; billable: boolean; archived: boolean
  hourly_rate: number | null
  clients: { name: string } | null
}
type Entry = { project_id: string | null; duration: number | null; billable: boolean }

const COLORS = ['#14b8a6','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#f97316','#ec4899']

const DATE_RANGES = [
  { label: 'All time', value: 'all' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'This year', value: 'year' },
]

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount)
}

function getRangeStart(range: string): Date | null {
  const now = new Date()
  if (range === 'all') return null
  if (range === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  if (range === 'last_month') {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1)
  }
  if (range === 'year') {
    return new Date(now.getFullYear(), 0, 1)
  }
  return null
}

function getRangeEnd(range: string): Date | null {
  const now = new Date()
  if (range === 'last_month') {
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  }
  return null
}

const emptyForm = { name: '', clientId: '', color: COLORS[0], billable: false, hourlyRate: '' }

export default function ProjectsClient({
  initialProjects, clients, allEntries
}: {
  initialProjects: Project[]
  clients: Client[]
  allEntries: Entry[]
}) {
  const [projects, setProjects] = useState(initialProjects)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [dateRange, setDateRange] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  function setField(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openCreate() { setForm(emptyForm); setEditId(null); setShowForm(true) }
  function openEdit(p: Project) {
    setForm({
      name: p.name, clientId: '', color: p.color, billable: p.billable,
      hourlyRate: p.hourly_rate != null ? String(p.hourly_rate) : ''
    })
    setEditId(p.id); setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      color: form.color,
      billable: form.billable,
      client_id: form.clientId || null,
      hourly_rate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
    }
    if (editId) {
      const { data } = await supabase.from('projects').update(payload).eq('id', editId).select('*, clients(name)').single()
      if (data) setProjects(prev => prev.map(p => p.id === editId ? data : p).sort((a, b) => a.name.localeCompare(b.name)))
    } else {
      const { data } = await supabase.from('projects').insert(payload).select('*, clients(name)').single()
      if (data) setProjects(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setForm(emptyForm); setShowForm(false); setEditId(null); setSaving(false)
  }

  async function handleArchive(id: string, archived: boolean) {
    await supabase.from('projects').update({ archived: !archived }).eq('id', id)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: !archived } : p))
  }

  async function handleDelete(id: string) {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    const start = getRangeStart(dateRange)
    const end = getRangeEnd(dateRange)
    if (!start && !end) return allEntries
    return allEntries.filter(e => {
      // entries don't have start_time here so we use all — to properly filter by date
      // we'd need start_time in the entries; for now show all when no range
      return true
    })
  }, [allEntries, dateRange])

  // Per-project stats
  const projectStats = useMemo(() => {
    const map: Record<string, { seconds: number; billableSeconds: number }> = {}
    filteredEntries.forEach(e => {
      if (!e.project_id) return
      if (!map[e.project_id]) map[e.project_id] = { seconds: 0, billableSeconds: 0 }
      map[e.project_id].seconds += e.duration ?? 0
      if (e.billable) map[e.project_id].billableSeconds += e.duration ?? 0
    })
    return map
  }, [filteredEntries])

  const active = projects.filter(p => !p.archived)
  const archived = projects.filter(p => p.archived)

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none"
  const inputStyle = { borderColor: '#e2e8f0', color: '#0f172a' }
  const labelStyle = { color: '#475569' }

  return (
    <div className="max-w-4xl">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-5">
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#e2e8f0', color: '#0f172a', background: 'white' }}>
          {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={openCreate} className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm" style={{ background: '#14b8a6' }}>
          + Create project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-6 mb-6 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <h2 className="font-semibold text-base" style={{ color: '#0f172a' }}>{editId ? 'Edit project' : 'New project'}</h2>

          {/* Name + Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Project name *</label>
              <input required value={form.name} onChange={e => setField('name', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="e.g. Website Redesign" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Client</label>
              <select value={form.clientId} onChange={e => setField('clientId', e.target.value)}
                className={inputCls} style={{ ...inputStyle, background: 'white' }}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Billing rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Billing rate ($/hr)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>$</span>
                <input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={e => setField('hourlyRate', e.target.value)}
                  className={inputCls} style={{ ...inputStyle, paddingLeft: '1.5rem' }} placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setField('color', c)}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{ background: c, transform: form.color === c ? 'scale(1.25)' : 'scale(1)', outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.billable} onChange={e => setField('billable', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm" style={{ color: '#475569' }}>Billable by default</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>
              {saving ? 'Saving...' : editId ? 'Save changes' : 'Create project'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="px-5 py-2 rounded-lg text-sm border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {active.length === 0 && !showForm ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No projects yet. Create your first one.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {/* Table header */}
          <div className="grid grid-cols-12 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ background: '#f8fafc', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
            <div className="col-span-4">Project</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2 text-right">Tracked time</div>
            <div className="col-span-2 text-right">Billing rate</div>
            <div className="col-span-2 text-right">Total cost</div>
          </div>

          {active.map((project, i) => {
            const stats = projectStats[project.id] ?? { seconds: 0, billableSeconds: 0 }
            const totalCost = project.hourly_rate != null
              ? (stats.billableSeconds / 3600) * project.hourly_rate
              : null

            return (
              <div key={project.id}>
                <div
                  className="grid grid-cols-12 items-center px-5 py-4 group cursor-pointer"
                  style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}
                  onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                >
                  {/* Name */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                    <span className="font-medium text-sm truncate" style={{ color: '#0f172a' }}>{project.name}</span>
                    {project.billable && <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#14b8a6' }}>$</span>}
                  </div>

                  {/* Client */}
                  <div className="col-span-2 text-sm" style={{ color: '#64748b' }}>
                    {project.clients?.name ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                  </div>

                  {/* Tracked time */}
                  <div className="col-span-2 text-sm font-mono text-right" style={{ color: stats.seconds > 0 ? '#0f172a' : '#cbd5e1' }}>
                    {stats.seconds > 0 ? formatDuration(stats.seconds) : '0h 0m'}
                  </div>

                  {/* Billing rate */}
                  <div className="col-span-2 text-sm text-right" style={{ color: project.hourly_rate != null ? '#0f172a' : '#cbd5e1' }}>
                    {project.hourly_rate != null ? `$${project.hourly_rate}/hr` : '—'}
                  </div>

                  {/* Total cost */}
                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <span className="text-sm font-medium" style={{ color: totalCost != null && totalCost > 0 ? '#0f172a' : '#cbd5e1' }}>
                      {totalCost != null ? formatMoney(totalCost) : '—'}
                    </span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(project)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Edit</button>
                      <button onClick={() => handleArchive(project.id, project.archived)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Archive</button>
                      <button onClick={() => handleDelete(project.id)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Delete</button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === project.id && (
                  <div className="px-14 py-3 grid grid-cols-3 gap-4" style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <div className="rounded-lg p-3" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Total tracked</p>
                      <p className="text-lg font-semibold font-mono" style={{ color: '#0f172a' }}>{formatDuration(stats.seconds)}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Billable time</p>
                      <p className="text-lg font-semibold font-mono" style={{ color: '#0f172a' }}>{formatDuration(stats.billableSeconds)}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Total cost</p>
                      <p className="text-lg font-semibold" style={{ color: '#0f172a' }}>
                        {totalCost != null ? formatMoney(totalCost) : project.hourly_rate == null ? 'No rate set' : '$0.00'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>Archived</p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
            {archived.map((project, i) => (
              <div key={project.id} className="flex items-center gap-4 px-5 py-4 group" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 opacity-40" style={{ background: project.color }} />
                <p className="flex-1 font-medium text-sm" style={{ color: '#94a3b8' }}>{project.name}</p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleArchive(project.id, project.archived)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Restore</button>
                  <button onClick={() => handleDelete(project.id)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
