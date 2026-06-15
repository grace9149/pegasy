'use client'

import { useState, useMemo } from 'react'

type Client = { id: string; name: string; email: string | null; address: string | null; currency: string | null }
type Project = { id: string; name: string; color: string; hourly_rate: number | null; client_id: string | null }
type Entry = {
  id: string; description: string | null; start_time: string; duration: number | null; billable: boolean
  projects: { id: string; name: string; color: string; hourly_rate: number | null } | null
}

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}
function pad(n: number) { return String(n).padStart(2, '0') }

export default function InvoicesClient({
  clients, projects, entries, userEmail
}: {
  clients: Client[]
  projects: Project[]
  entries: Entry[]
  userEmail: string
}) {
  const [step, setStep] = useState<'setup' | 'preview'>('setup')

  // Setup state
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}${pad(new Date().getDate())}`)
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromAddress, setFromAddress] = useState('')

  const client = clients.find(c => c.id === clientId)
  const currency = client?.currency ?? 'USD'

  function toggleProject(id: string) {
    setSelectedProjectIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  // Projects that belong to selected client
  const clientProjects = useMemo(() =>
    projects.filter(p => !clientId || p.client_id === clientId || !p.client_id),
    [projects, clientId]
  )

  // Filter entries
  const invoiceEntries = useMemo(() => {
    return entries.filter(e => {
      if (!e.projects) return false
      if (selectedProjectIds.length > 0 && !selectedProjectIds.includes(e.projects.id)) return false
      if (dateFrom && e.start_time < dateFrom) return false
      if (dateTo && e.start_time > dateTo + 'T23:59:59') return false
      return true
    })
  }, [entries, selectedProjectIds, dateFrom, dateTo])

  // Group by project for line items
  const lineItems = useMemo(() => {
    const map: Record<string, { projectName: string; color: string; hours: number; rate: number | null; entries: Entry[] }> = {}
    invoiceEntries.forEach(e => {
      const pid = e.projects!.id
      if (!map[pid]) map[pid] = { projectName: e.projects!.name, color: e.projects!.color, hours: 0, rate: e.projects!.hourly_rate, entries: [] }
      map[pid].hours += (e.duration ?? 0) / 3600
      map[pid].entries.push(e)
    })
    return Object.values(map)
  }, [invoiceEntries])

  const subtotal = lineItems.reduce((s, l) => s + (l.rate != null ? l.hours * l.rate : 0), 0)
  const totalHours = lineItems.reduce((s, l) => s + l.hours, 0)

  function handlePrint() {
    window.print()
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none"
  const inputStyle = { borderColor: '#e2e8f0', color: '#0f172a' }
  const labelStyle = { color: '#475569' }

  if (step === 'preview') {
    return (
      <div>
        {/* Toolbar — hidden on print */}
        <div className="flex items-center gap-3 mb-6 print:hidden">
          <button onClick={() => setStep('setup')} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '15px' }} />
            Edit
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>
            <i className="ti ti-printer" style={{ fontSize: '15px' }} />
            Print / Save PDF
          </button>
        </div>

        {/* Invoice document */}
        <div className="rounded-xl border max-w-3xl bg-white p-10 print:shadow-none print:border-none print:max-w-full print:rounded-none" style={{ borderColor: '#e2e8f0' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="text-3xl font-bold mb-1" style={{ color: '#14b8a6' }}>INVOICE</div>
              <div className="text-sm" style={{ color: '#64748b' }}>#{invoiceNumber}</div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg" style={{ color: '#0f172a' }}>{fromName || userEmail}</p>
              {fromAddress && <p className="text-sm mt-1 whitespace-pre-line" style={{ color: '#64748b' }}>{fromAddress}</p>}
            </div>
          </div>

          {/* Bill to + dates */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Bill to</p>
              <p className="font-semibold" style={{ color: '#0f172a' }}>{client?.name ?? '—'}</p>
              {client?.email && <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{client.email}</p>}
              {client?.address && <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{client.address}</p>}
            </div>
            <div className="text-right">
              <div className="space-y-1">
                <div className="flex justify-end gap-8">
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Issue date</span>
                  <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{fmtDate(issueDate)}</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Due date</span>
                  <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{fmtDate(dueDate)}</span>
                </div>
                {(dateFrom || dateTo) && (
                  <div className="flex justify-end gap-8">
                    <span className="text-sm" style={{ color: '#94a3b8' }}>Period</span>
                    <span className="text-sm font-medium" style={{ color: '#0f172a' }}>
                      {dateFrom ? fmtDate(dateFrom) : '—'} – {dateTo ? fmtDate(dateTo) : '—'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line items table */}
          <table className="w-full mb-8">
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Description</th>
                <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Hours</th>
                <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Rate</th>
                <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{item.projectName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-sm font-mono" style={{ color: '#475569' }}>{item.hours.toFixed(2)}</td>
                  <td className="py-3 text-right text-sm" style={{ color: '#475569' }}>
                    {item.rate != null ? formatMoney(item.rate, currency) + '/hr' : <span style={{ color: '#cbd5e1' }}>No rate</span>}
                  </td>
                  <td className="py-3 text-right text-sm font-semibold" style={{ color: '#0f172a' }}>
                    {item.rate != null ? formatMoney(item.hours * item.rate, currency) : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#64748b' }}>Total hours</span>
                <span className="font-mono" style={{ color: '#0f172a' }}>{totalHours.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2" style={{ borderTop: '2px solid #0f172a' }}>
                <span className="font-bold" style={{ color: '#0f172a' }}>Total due</span>
                <span className="font-bold text-lg" style={{ color: '#14b8a6' }}>{formatMoney(subtotal, currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="pt-6" style={{ borderTop: '1px solid #f1f5f9' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Notes</p>
              <p className="text-sm whitespace-pre-line" style={{ color: '#64748b' }}>{notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="grid grid-cols-2 gap-6">
        {/* Left: invoice settings */}
        <div className="space-y-5">
          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Invoice details</h2>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Invoice number</label>
              <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Issue date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Due date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#0f172a' }}>From (your info)</h2>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Business / Your name</label>
              <input value={fromName} onChange={e => setFromName(e.target.value)} className={inputCls} style={inputStyle} placeholder={userEmail} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Address</label>
              <textarea value={fromAddress} onChange={e => setFromAddress(e.target.value)} rows={2} className={inputCls} style={inputStyle} placeholder="123 Main St..." />
            </div>
          </div>

          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Notes</h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputCls} style={inputStyle} placeholder="Payment terms, bank details, thank you note..." />
          </div>
        </div>

        {/* Right: filter entries */}
        <div className="space-y-5">
          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Bill to</h2>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Client</label>
              <select value={clientId} onChange={e => { setClientId(e.target.value); setSelectedProjectIds([]) }}
                className={inputCls} style={{ ...inputStyle, background: 'white' }}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Date range</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-5" style={{ background: 'white', borderColor: '#e2e8f0' }}>
            <h2 className="font-semibold text-sm mb-3" style={{ color: '#0f172a' }}>Projects to include</h2>
            <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>Leave all unchecked to include all billable entries.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {clientProjects.length === 0 ? (
                <p className="text-sm" style={{ color: '#94a3b8' }}>No projects found.</p>
              ) : clientProjects.map(p => (
                <label key={p.id} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={selectedProjectIds.includes(p.id)} onChange={() => toggleProject(p.id)} className="w-4 h-4" />
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-sm flex-1" style={{ color: '#0f172a' }}>{p.name}</span>
                  {p.hourly_rate != null && <span className="text-xs" style={{ color: '#94a3b8' }}>${p.hourly_rate}/hr</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl p-4" style={{ background: '#f0fdfa' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{invoiceEntries.length} billable entries</span>
              <span className="font-bold" style={{ color: '#14b8a6' }}>{formatMoney(subtotal, currency)}</span>
            </div>
            <p className="text-xs" style={{ color: '#64748b' }}>{totalHours.toFixed(2)} total hours</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={() => setStep('preview')} className="px-6 py-3 rounded-lg text-white font-semibold" style={{ background: '#14b8a6' }}>
          Preview invoice →
        </button>
      </div>
    </div>
  )
}
