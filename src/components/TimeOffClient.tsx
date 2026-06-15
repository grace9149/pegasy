'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

type Policy = { id: string; name: string; description: string | null; days_per_year: number; color: string }
type Balance = { id: string; user_id: string; policy_id: string; used_days: number; year: number; policy: { name: string; color: string; days_per_year: number } | null }
type Request = {
  id: string; user_id: string; policy_id: string | null; start_date: string; end_date: string
  days: number; status: 'pending' | 'approved' | 'denied'; note: string | null; reviewer_note: string | null
  created_at: string
  policy: { name: string; color: string } | null
  requester: { email: string | null } | null
}
type Member = { user_id: string; role: string }

type Tab = 'request' | 'timeline' | 'balance' | 'policies' | 'admin'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  approved: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
  denied:   { bg: '#fee2e2', color: '#991b1b', label: 'Denied' },
}

const POLICY_COLORS = ['#14b8a6','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#f97316','#ec4899']

function businessDays(start: string, end: string) {
  let count = 0
  const cur = new Date(start + 'T12:00:00')
  const last = new Date(end + 'T12:00:00')
  while (cur <= last) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TimeOffClient({
  currentUserId, currentUserEmail, isAdmin,
  initialRequests, initialPolicies, allBalances, members
}: {
  currentUserId: string
  currentUserEmail: string
  isAdmin: boolean
  initialRequests: Request[]
  initialPolicies: Policy[]
  allBalances: Balance[]
  members: Member[]
}) {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const currentYear = new Date().getFullYear()

  const [tab, setTab] = useState<Tab>('request')
  const [requests, setRequests] = useState(initialRequests)
  const [policies, setPolicies] = useState(initialPolicies)
  const [balances, setBalances] = useState(allBalances)

  // --- Request form ---
  const [showReqForm, setShowReqForm] = useState(false)
  const [reqPolicyId, setReqPolicyId] = useState(initialPolicies[0]?.id ?? '')
  const [reqStart, setReqStart] = useState('')
  const [reqEnd, setReqEnd] = useState('')
  const [reqNote, setReqNote] = useState('')
  const [reqSaving, setReqSaving] = useState(false)
  const [reqError, setReqError] = useState('')

  // --- Review ---
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  // --- Policy form ---
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [editPolicyId, setEditPolicyId] = useState<string | null>(null)
  const [policyName, setPolicyName] = useState('')
  const [policyDesc, setPolicyDesc] = useState('')
  const [policyDays, setPolicyDays] = useState('')
  const [policyColor, setPolicyColor] = useState(POLICY_COLORS[0])
  const [policySaving, setPolicySaving] = useState(false)

  // --- Balance adjustment ---
  const [adjustUserId, setAdjustUserId] = useState(members[0]?.user_id ?? '')
  const [adjustPolicyId, setAdjustPolicyId] = useState(initialPolicies[0]?.id ?? '')
  const [adjustDays, setAdjustDays] = useState('')
  const [adjustYear, setAdjustYear] = useState(String(currentYear))
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState('')

  const reqDays = reqStart && reqEnd && reqEnd >= reqStart ? businessDays(reqStart, reqEnd) : 0

  // ---- Requests ----
  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault()
    setReqError('')
    if (!reqStart || !reqEnd || reqEnd < reqStart) { setReqError('Please select a valid date range.'); return }
    if (reqDays < 1) { setReqError('No business days in selected range.'); return }
    setReqSaving(true)
    const { data, error } = await supabase.from('time_off_requests')
      .insert({ user_id: currentUserId, policy_id: reqPolicyId || null, start_date: reqStart, end_date: reqEnd, days: reqDays, note: reqNote || null })
      .select('*, policy:policy_id(name, color), requester:user_id(email)')
      .single()
    if (error) { setReqError(error.message); setReqSaving(false); return }
    if (data) setRequests(prev => [data, ...prev])
    setShowReqForm(false); setReqStart(''); setReqEnd(''); setReqNote(''); setReqSaving(false)
  }

  async function handleCancel(id: string) {
    await supabase.from('time_off_requests').delete().eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  async function handleReview(id: string, status: 'approved' | 'denied') {
    const { data } = await supabase.from('time_off_requests')
      .update({ status, reviewer_note: reviewNote || null })
      .eq('id', id)
      .select('*, policy:policy_id(name, color), requester:user_id(email)')
      .single()
    if (data) setRequests(prev => prev.map(r => r.id === id ? data : r))
    setReviewingId(null); setReviewNote('')
  }

  // ---- Policies ----
  function openNewPolicy() {
    setEditPolicyId(null); setPolicyName(''); setPolicyDesc(''); setPolicyDays(''); setPolicyColor(POLICY_COLORS[0])
    setShowPolicyForm(true)
  }
  function openEditPolicy(p: Policy) {
    setEditPolicyId(p.id); setPolicyName(p.name); setPolicyDesc(p.description ?? ''); setPolicyDays(String(p.days_per_year)); setPolicyColor(p.color)
    setShowPolicyForm(true)
  }
  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault()
    setPolicySaving(true)
    const payload = { name: policyName, description: policyDesc || null, days_per_year: parseFloat(policyDays), color: policyColor }
    if (editPolicyId) {
      const { data } = await supabase.from('time_off_policies').update(payload).eq('id', editPolicyId).select().single()
      if (data) setPolicies(prev => prev.map(p => p.id === editPolicyId ? data : p))
    } else {
      const { data } = await supabase.from('time_off_policies').insert(payload).select().single()
      if (data) setPolicies(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setShowPolicyForm(false); setEditPolicyId(null); setPolicySaving(false)
  }
  async function handleDeletePolicy(id: string) {
    await supabase.from('time_off_policies').delete().eq('id', id)
    setPolicies(prev => prev.filter(p => p.id !== id))
  }

  // ---- Balance adjustment ----
  async function handleAdjustBalance(e: React.FormEvent) {
    e.preventDefault()
    setAdjustError(''); setAdjustSuccess('')
    if (!adjustUserId || !adjustPolicyId || !adjustDays) { setAdjustError('All fields required.'); return }
    setAdjustSaving(true)
    const used = parseFloat(adjustDays)
    const year = parseInt(adjustYear)
    const { data, error } = await supabase.from('time_off_balances')
      .upsert({ user_id: adjustUserId, policy_id: adjustPolicyId, used_days: used, year }, { onConflict: 'user_id,policy_id,year' })
      .select('*, policy:policy_id(name, color, days_per_year)')
      .single()
    if (error) { setAdjustError(error.message); setAdjustSaving(false); return }
    if (data) setBalances(prev => {
      const exists = prev.find(b => b.user_id === adjustUserId && b.policy_id === adjustPolicyId && b.year === year)
      return exists ? prev.map(b => b.user_id === adjustUserId && b.policy_id === adjustPolicyId && b.year === year ? data : b) : [...prev, data]
    })
    setAdjustSuccess('Balance updated.'); setAdjustDays(''); setAdjustSaving(false)
  }

  const myRequests = requests.filter(r => r.user_id === currentUserId)
  const pendingOthers = requests.filter(r => r.user_id !== currentUserId && r.status === 'pending')
  const timeline = [...requests].filter(r => r.status !== 'denied').sort((a, b) => a.start_date.localeCompare(b.start_date))

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'request', label: 'My Requests', icon: 'ti-send' },
    { key: 'timeline', label: 'Timeline', icon: 'ti-calendar' },
    { key: 'balance', label: 'Balances', icon: 'ti-chart-pie' },
    { key: 'policies', label: 'Policies', icon: 'ti-clipboard-list' },
    ...(isAdmin ? [{ key: 'admin' as Tab, label: 'Admin', icon: 'ti-settings' }] : []),
  ]

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none"
  const inputStyle = { borderColor: '#e2e8f0', color: '#0f172a' }
  const labelStyle = { color: '#475569' }

  return (
    <div className="max-w-4xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: '#f1f5f9' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? '#0f172a' : '#64748b' }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: '15px' }} />
            {t.label}
            {t.key === 'admin' && pendingOthers.length > 0 && (
              <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#ef4444' }}>{pendingOthers.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* MY REQUESTS */}
      {tab === 'request' && (
        <div>
          <div className="flex justify-end mb-5">
            <button onClick={() => setShowReqForm(true)} className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm" style={{ background: '#14b8a6' }}>
              + Request time off
            </button>
          </div>

          {showReqForm && (
            <form onSubmit={handleSubmitRequest} className="rounded-xl border p-6 mb-6 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
              <h2 className="font-semibold text-base" style={{ color: '#0f172a' }}>New time off request</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Type</label>
                  <select value={reqPolicyId} onChange={e => setReqPolicyId(e.target.value)} className={inputCls} style={{ ...inputStyle, background: 'white' }}>
                    {policies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Start date</label>
                  <input type="date" required min={today} value={reqStart} onChange={e => setReqStart(e.target.value)} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>End date</label>
                  <input type="date" required min={reqStart || today} value={reqEnd} onChange={e => setReqEnd(e.target.value)} className={inputCls} style={inputStyle} />
                </div>
              </div>
              {reqDays > 0 && (
                <div className="flex items-center gap-2 rounded-lg px-4 py-2.5" style={{ background: '#f0fdfa' }}>
                  <i className="ti ti-info-circle" style={{ color: '#14b8a6', fontSize: '16px' }} />
                  <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{reqDays} business day{reqDays !== 1 ? 's' : ''}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Note (optional)</label>
                <textarea value={reqNote} onChange={e => setReqNote(e.target.value)} rows={2} className={inputCls} style={inputStyle} placeholder="Any details for your manager..." />
              </div>
              {reqError && <p className="text-sm rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: '#ef4444' }}>{reqError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={reqSaving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>
                  {reqSaving ? 'Submitting...' : 'Submit request'}
                </button>
                <button type="button" onClick={() => { setShowReqForm(false); setReqError('') }} className="px-5 py-2 rounded-lg text-sm border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Cancel</button>
              </div>
            </form>
          )}

          {myRequests.length === 0 && !showReqForm ? (
            <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No time off requests yet.</div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(req => {
                const s = STATUS_STYLE[req.status]
                return (
                  <div key={req.id} className="rounded-xl border p-5" style={{ background: 'white', borderColor: '#e2e8f0' }}>
                    <div className="flex items-start gap-4">
                      {req.policy && <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: req.policy.color }} />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>
                            {fmtDate(req.start_date)}{req.start_date !== req.end_date ? ` – ${fmtDate(req.end_date)}` : ''}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                          {req.policy && <span className="text-xs" style={{ color: '#64748b' }}>{req.policy.name}</span>}
                        </div>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{req.days} business day{req.days !== 1 ? 's' : ''}</p>
                        {req.note && <p className="text-xs mt-1 italic" style={{ color: '#64748b' }}>"{req.note}"</p>}
                        {req.reviewer_note && <p className="text-xs mt-1" style={{ color: '#64748b' }}>Manager note: {req.reviewer_note}</p>}
                      </div>
                      {req.status === 'pending' && (
                        <button onClick={() => handleCancel(req.id)} className="text-xs px-3 py-1.5 rounded-lg border flex-shrink-0" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Cancel</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TIMELINE */}
      {tab === 'timeline' && (
        <div>
          {timeline.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No time off on record.</div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
              <div className="grid grid-cols-12 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ background: '#f8fafc', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                <div className="col-span-3">Employee</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-4">Dates</div>
                <div className="col-span-1">Days</div>
                <div className="col-span-2">Status</div>
              </div>
              {timeline.map((req, i) => {
                const s = STATUS_STYLE[req.status]
                const isPast = req.end_date < today
                return (
                  <div key={req.id} className="grid grid-cols-12 items-center px-5 py-3.5" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', opacity: isPast ? 0.45 : 1 }}>
                    <div className="col-span-3 text-sm truncate" style={{ color: '#0f172a' }}>{req.requester?.email?.split('@')[0] ?? 'Unknown'}</div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      {req.policy && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: req.policy.color }} />}
                      <span className="text-xs truncate" style={{ color: '#64748b' }}>{req.policy?.name ?? '—'}</span>
                    </div>
                    <div className="col-span-4 text-sm" style={{ color: '#475569' }}>
                      {fmtDate(req.start_date)}{req.start_date !== req.end_date ? ` – ${fmtDate(req.end_date)}` : ''}
                    </div>
                    <div className="col-span-1 text-sm" style={{ color: '#64748b' }}>{req.days}d</div>
                    <div className="col-span-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* BALANCES */}
      {tab === 'balance' && (
        <div>
          <p className="text-sm font-medium mb-5" style={{ color: '#64748b' }}>{currentYear} balances for {currentUserEmail}</p>
          <div className="grid grid-cols-1 gap-4">
            {policies.map(policy => {
              const used = myRequests.filter(r => r.policy_id === policy.id && r.status === 'approved' && new Date(r.start_date).getFullYear() === currentYear)
                .reduce((s, r) => s + r.days, 0)
              const manualBalance = balances.find(b => b.user_id === currentUserId && b.policy_id === policy.id && b.year === currentYear)
              const adjustedUsed = manualBalance ? manualBalance.used_days : used
              const pending = myRequests.filter(r => r.policy_id === policy.id && r.status === 'pending' && new Date(r.start_date).getFullYear() === currentYear)
                .reduce((s, r) => s + r.days, 0)
              const total = policy.days_per_year
              const remaining = Math.max(0, total - adjustedUsed)
              const usedPct = total > 0 ? Math.min(100, (adjustedUsed / total) * 100) : 0
              const pendingPct = total > 0 ? Math.min(100 - usedPct, (pending / total) * 100) : 0
              return (
                <div key={policy.id} className="rounded-xl border p-5" style={{ background: 'white', borderColor: '#e2e8f0' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: policy.color }} />
                      <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>{policy.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold" style={{ color: '#0f172a' }}>{remaining}</span>
                      <span className="text-sm ml-1" style={{ color: '#94a3b8' }}>/ {total} days remaining</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: '#f1f5f9' }}>
                    <div className="h-full flex">
                      <div className="h-full rounded-l-full" style={{ width: `${usedPct}%`, background: policy.color }} />
                      {pendingPct > 0 && <div className="h-full" style={{ width: `${pendingPct}%`, background: policy.color, opacity: 0.35 }} />}
                    </div>
                  </div>
                  <div className="flex gap-6 text-xs" style={{ color: '#64748b' }}>
                    <span><span className="font-semibold" style={{ color: '#0f172a' }}>{adjustedUsed}</span> used</span>
                    {pending > 0 && <span><span className="font-semibold" style={{ color: '#0f172a' }}>{pending}</span> pending</span>}
                    <span><span className="font-semibold" style={{ color: '#0f172a' }}>{total}</span> total</span>
                  </div>
                  {policy.description && <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>{policy.description}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* POLICIES (read-only for non-admin) */}
      {tab === 'policies' && (
        <div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
            {policies.length === 0 ? (
              <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No policies configured.</div>
            ) : policies.map((policy, i) => (
              <div key={policy.id} className="px-5 py-5 flex items-start gap-4" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${policy.color}20` }}>
                  <i className="ti ti-beach" style={{ color: policy.color, fontSize: '18px' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-sm" style={{ color: '#0f172a' }}>{policy.name}</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: `${policy.color}20`, color: policy.color }}>
                      {policy.days_per_year} days/year
                    </span>
                  </div>
                  {policy.description && <p className="text-sm" style={{ color: '#64748b' }}>{policy.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN TAB */}
      {tab === 'admin' && isAdmin && (
        <div className="space-y-10">

          {/* --- Pending Requests --- */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>Pending Requests</h2>
              {pendingOthers.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#ef4444' }}>{pendingOthers.length}</span>
              )}
            </div>
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <div className="text-center py-10 rounded-xl border text-sm" style={{ color: '#94a3b8', borderColor: '#e2e8f0' }}>No pending requests.</div>
            ) : (
              <div className="space-y-3">
                {requests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="rounded-xl border p-5" style={{ background: 'white', borderColor: '#e2e8f0' }}>
                    <div className="flex items-start gap-4">
                      {req.policy && <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: req.policy.color }} />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>{req.requester?.email ?? 'Unknown'}</span>
                          {req.policy && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#64748b' }}>{req.policy.name}</span>}
                        </div>
                        <p className="text-sm" style={{ color: '#475569' }}>
                          {fmtDate(req.start_date)}{req.start_date !== req.end_date ? ` – ${fmtDate(req.end_date)}` : ''} · {req.days} day{req.days !== 1 ? 's' : ''}
                        </p>
                        {req.note && <p className="text-xs mt-1 italic" style={{ color: '#94a3b8' }}>"{req.note}"</p>}

                        {reviewingId === req.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2}
                              placeholder="Add a note for the employee (optional)"
                              className="w-full border rounded-lg px-3 py-2 text-xs outline-none" style={{ borderColor: '#e2e8f0', color: '#0f172a' }} />
                            <div className="flex gap-2">
                              <button onClick={() => handleReview(req.id, 'approved')} className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ background: '#10b981' }}>
                                <i className="ti ti-check mr-1" />Approve
                              </button>
                              <button onClick={() => handleReview(req.id, 'denied')} className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ background: '#ef4444' }}>
                                <i className="ti ti-x mr-1" />Deny
                              </button>
                              <button onClick={() => { setReviewingId(null); setReviewNote('') }} className="px-4 py-1.5 rounded-lg text-xs border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setReviewingId(req.id)} className="mt-3 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* --- Manage Policies --- */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>Manage Policies</h2>
              <button onClick={openNewPolicy} className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>+ Add policy</button>
            </div>

            {showPolicyForm && (
              <form onSubmit={handleSavePolicy} className="rounded-xl border p-5 mb-5 space-y-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
                <h3 className="font-semibold text-sm" style={{ color: '#0f172a' }}>{editPolicyId ? 'Edit policy' : 'New policy'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Policy name *</label>
                    <input required value={policyName} onChange={e => setPolicyName(e.target.value)} className={inputCls} style={inputStyle} placeholder="e.g. Vacation" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Days per year *</label>
                    <input required type="number" min="0" step="0.5" value={policyDays} onChange={e => setPolicyDays(e.target.value)} className={inputCls} style={inputStyle} placeholder="15" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Description</label>
                  <input value={policyDesc} onChange={e => setPolicyDesc(e.target.value)} className={inputCls} style={inputStyle} placeholder="Brief description of this policy" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Color</label>
                  <div className="flex gap-2">
                    {POLICY_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setPolicyColor(c)}
                        className="w-7 h-7 rounded-full transition-transform"
                        style={{ background: c, transform: policyColor === c ? 'scale(1.25)' : 'scale(1)', outline: policyColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={policySaving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>
                    {policySaving ? 'Saving...' : editPolicyId ? 'Save changes' : 'Create policy'}
                  </button>
                  <button type="button" onClick={() => { setShowPolicyForm(false); setEditPolicyId(null) }} className="px-5 py-2 rounded-lg text-sm border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Cancel</button>
                </div>
              </form>
            )}

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
              {policies.length === 0 ? (
                <div className="text-center py-10 text-sm" style={{ color: '#94a3b8' }}>No policies yet.</div>
              ) : policies.map((policy, i) => (
                <div key={policy.id} className="flex items-center gap-4 px-5 py-4 group" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: policy.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: '#0f172a' }}>{policy.name}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{policy.days_per_year} days/year{policy.description ? ` · ${policy.description}` : ''}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditPolicy(policy)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Edit</button>
                    <button onClick={() => handleDeletePolicy(policy.id)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* --- Adjust Balances --- */}
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#0f172a' }}>Adjust Balances</h2>
            <div className="rounded-xl border p-5" style={{ background: 'white', borderColor: '#e2e8f0' }}>
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>Override the used days for any employee and policy. Use this to manually adjust accruals, carryovers, or corrections.</p>
              <form onSubmit={handleAdjustBalance} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Employee</label>
                    <select value={adjustUserId} onChange={e => setAdjustUserId(e.target.value)} className={inputCls} style={{ ...inputStyle, background: 'white' }}>
                      {members.length > 0 ? members.map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.user_id}</option>
                      )) : <option value={currentUserId}>{currentUserEmail}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Policy</label>
                    <select value={adjustPolicyId} onChange={e => setAdjustPolicyId(e.target.value)} className={inputCls} style={{ ...inputStyle, background: 'white' }}>
                      {policies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Used days (override)</label>
                    <input type="number" min="0" step="0.5" required value={adjustDays} onChange={e => setAdjustDays(e.target.value)} className={inputCls} style={inputStyle} placeholder="e.g. 5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Year</label>
                    <input type="number" required value={adjustYear} onChange={e => setAdjustYear(e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                </div>
                {adjustError && <p className="text-sm rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: '#ef4444' }}>{adjustError}</p>}
                {adjustSuccess && <p className="text-sm rounded-lg px-3 py-2" style={{ background: '#f0fdf4', color: '#166534' }}>{adjustSuccess}</p>}
                <button type="submit" disabled={adjustSaving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#14b8a6' }}>
                  {adjustSaving ? 'Saving...' : 'Update balance'}
                </button>
              </form>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
