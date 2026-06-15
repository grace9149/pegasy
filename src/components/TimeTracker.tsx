'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Project = { id: string; name: string; color: string }
type TimeEntry = {
  id: string
  description: string | null
  start_time: string
  end_time: string | null
  duration: number | null
  billable: boolean
  projects: { name: string; color: string } | null
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function TimeTracker({
  userId,
  initialEntries,
  projects,
}: {
  userId: string
  initialEntries: TimeEntry[]
  projects: Project[]
}) {
  const [description, setDescription] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [billable, setBillable] = useState(false)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries)
  const startRef = useRef<Date | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current.getTime()) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  async function handleStart() {
    const now = new Date()
    startRef.current = now
    setElapsed(0)
    setRunning(true)

    const { data } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        description: description || null,
        project_id: selectedProject || null,
        billable,
        start_time: now.toISOString(),
      })
      .select('*, projects(name, color)')
      .single()

    if (data) setActiveEntryId(data.id)
  }

  async function handleStop() {
    if (!activeEntryId || !startRef.current) return
    const now = new Date()
    const duration = Math.floor((now.getTime() - startRef.current.getTime()) / 1000)

    const { data } = await supabase
      .from('time_entries')
      .update({ end_time: now.toISOString(), duration })
      .eq('id', activeEntryId)
      .select('*, projects(name, color)')
      .single()

    setRunning(false)
    setElapsed(0)
    setActiveEntryId(null)
    setDescription('')
    setSelectedProject('')

    if (data) setEntries(prev => [data, ...prev])
  }

  async function handleDelete(id: string) {
    await supabase.from('time_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const key = formatDate(entry.start_time)
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Timer bar */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <input
          type="text"
          placeholder="What are you working on?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="flex-1 outline-none"
          style={{ color: '#0f172a', fontSize: '15px' }}
          onKeyDown={e => e.key === 'Enter' && !running && handleStart()}
        />

        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className="rounded-lg px-3 py-2 outline-none border"
          style={{ borderColor: '#e2e8f0', color: '#64748b', background: 'white', fontSize: '14px' }}
        >
          <option value="">No project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button
          onClick={() => setBillable(b => !b)}
          title="Toggle billable"
          className="px-3 py-2 rounded-lg border transition-colors font-semibold"
          style={billable
            ? { borderColor: '#14b8a6', color: '#14b8a6', background: '#f0fdfa', fontSize: '14px' }
            : { borderColor: '#e2e8f0', color: '#94a3b8', background: 'white', fontSize: '14px' }
          }
        >
          $
        </button>

        {running && (
          <span className="font-mono font-semibold w-28 text-center" style={{ color: '#0f172a', fontSize: '18px' }}>
            {formatDuration(elapsed)}
          </span>
        )}

        <button
          onClick={running ? handleStop : handleStart}
          className="px-6 py-2.5 rounded-lg text-white font-semibold transition-colors"
          style={{ background: running ? '#ef4444' : '#14b8a6', fontSize: '15px' }}
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Entries */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>
          No time entries yet. Start the timer to track your first entry.
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateEntries]) => {
          const totalSeconds = dateEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
          return (
            <div key={date}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="font-semibold uppercase tracking-wider" style={{ color: '#64748b', fontSize: '12px' }}>{date}</span>
                <span className="font-mono font-medium" style={{ color: '#64748b', fontSize: '13px' }}>{formatDuration(totalSeconds)}</span>
              </div>
              <div className="rounded-xl border divide-y" style={{ background: 'white', borderColor: '#e2e8f0' }}>
                {dateEntries.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 group">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.projects?.color ?? '#14b8a6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: '14px', color: entry.description ? '#0f172a' : '#94a3b8', fontStyle: entry.description ? 'normal' : 'italic' }}>
                        {entry.description || 'No description'}
                      </p>
                      {entry.projects && (
                        <p className="mt-0.5" style={{ fontSize: '12px', color: '#94a3b8' }}>{entry.projects.name}</p>
                      )}
                    </div>
                    {entry.billable && (
                      <span className="font-semibold" style={{ color: '#14b8a6', fontSize: '13px' }}>$</span>
                    )}
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                      {formatTime(entry.start_time)} – {entry.end_time ? formatTime(entry.end_time) : '...'}
                    </span>
                    <span className="font-mono font-medium w-24 text-right" style={{ color: '#334155', fontSize: '14px' }}>
                      {formatDuration(entry.duration ?? 0)}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs ml-1 transition-opacity"
                      style={{ color: '#cbd5e1' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
