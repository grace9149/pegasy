'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Tag = { id: string; name: string }

export default function TagsClient({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState(initialTags)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('tags').insert({ name }).select().single()
    if (data) setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setName(''); setShowForm(false); setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('tags').delete().eq('id', id)
    setTags(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="max-w-2xl">
      <div className="flex justify-end mb-5">
        <button onClick={() => setShowForm(true)} className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm" style={{ background: '#14b8a6' }}>
          + Add tag
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border p-5 mb-6 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <h2 className="font-semibold text-base" style={{ color: '#0f172a' }}>New tag</h2>
          <input required value={name} onChange={e => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
            placeholder="e.g. Design" />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>
              {saving ? 'Saving...' : 'Add tag'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg text-sm border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Cancel</button>
          </div>
        </form>
      )}

      {tags.length === 0 && !showForm ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No tags yet. Add your first one.</div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2 px-4 py-2 rounded-full border group" style={{ background: 'white', borderColor: '#e2e8f0' }}>
              <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{tag.name}</span>
              <button onClick={() => handleDelete(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs" style={{ color: '#94a3b8' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
