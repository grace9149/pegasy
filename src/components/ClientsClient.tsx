'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type ClientRow = {
  id: string; name: string; archived: boolean
  email: string | null; phone: string | null; address: string | null
  currency: string | null; notes: string | null
}

const CURRENCIES = ['USD','EUR','GBP','CAD','AUD','JPY','CHF','MXN','BRL','INR']

const emptyForm = { name: '', email: '', phone: '', address: '', currency: 'USD', notes: '' }

export default function ClientsClient({ initialClients }: { initialClients: ClientRow[] }) {
  const [clients, setClients] = useState(initialClients)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openCreate() { setForm(emptyForm); setEditId(null); setShowForm(true) }
  function openEdit(c: ClientRow) {
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', currency: c.currency ?? 'USD', notes: c.notes ?? '' })
    setEditId(c.id); setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      currency: form.currency || 'USD',
      notes: form.notes || null,
    }
    if (editId) {
      const { data } = await supabase.from('clients').update(payload).eq('id', editId).select().single()
      if (data) setClients(prev => prev.map(c => c.id === editId ? data : c).sort((a, b) => a.name.localeCompare(b.name)))
    } else {
      const { data } = await supabase.from('clients').insert(payload).select().single()
      if (data) setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setForm(emptyForm); setShowForm(false); setEditId(null); setSaving(false)
  }

  async function handleArchive(id: string, archived: boolean) {
    await supabase.from('clients').update({ archived: !archived }).eq('id', id)
    setClients(prev => prev.map(c => c.id === id ? { ...c, archived: !archived } : c))
  }

  async function handleDelete(id: string) {
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  const active = clients.filter(c => !c.archived)
  const archived = clients.filter(c => c.archived)

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"
  const inputStyle = { borderColor: '#e2e8f0', color: '#0f172a' }
  const labelStyle = { color: '#475569' }

  return (
    <div className="max-w-3xl">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm" style={{ background: '#14b8a6' }}>
          + Add client
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-6 mb-6 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <h2 className="font-semibold text-base" style={{ color: '#0f172a' }}>{editId ? 'Edit client' : 'New client'}</h2>

          {/* Name + Currency row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Client name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className={inputCls} style={{ ...inputStyle, background: 'white' }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="billing@acme.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="123 Main St, New York, NY 10001" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className={inputCls} style={inputStyle} placeholder="Any additional details..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>
              {saving ? 'Saving...' : editId ? 'Save changes' : 'Add client'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="px-5 py-2 rounded-lg text-sm border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {active.length === 0 && !showForm ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No clients yet. Add your first one.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {active.map((client, i) => (
            <div key={client.id} className="flex items-start gap-4 px-5 py-4 group" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5" style={{ background: '#14b8a6' }}>
                {client.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm" style={{ color: '#0f172a' }}>{client.name}</p>
                  {client.currency && client.currency !== 'USD' && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#64748b' }}>{client.currency}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {client.email && <p className="text-xs" style={{ color: '#64748b' }}>{client.email}</p>}
                  {client.phone && <p className="text-xs" style={{ color: '#64748b' }}>{client.phone}</p>}
                  {client.address && <p className="text-xs" style={{ color: '#94a3b8' }}>{client.address}</p>}
                </div>
                {client.notes && <p className="text-xs mt-1 italic" style={{ color: '#94a3b8' }}>{client.notes}</p>}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => openEdit(client)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Edit</button>
                <button onClick={() => handleArchive(client.id, client.archived)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Archive</button>
                <button onClick={() => handleDelete(client.id)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>Archived</p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
            {archived.map((client, i) => (
              <div key={client.id} className="flex items-center gap-4 px-5 py-4 group" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#e2e8f0', color: '#94a3b8' }}>
                  {client.name.slice(0, 1).toUpperCase()}
                </div>
                <p className="flex-1 font-medium text-sm" style={{ color: '#94a3b8' }}>{client.name}</p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleArchive(client.id, client.archived)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Restore</button>
                  <button onClick={() => handleDelete(client.id)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
