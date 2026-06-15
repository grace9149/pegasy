'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Member = { id: string; user_id: string; role: string; user: { email: string } | null }

export default function TeamClient({ currentUserId, initialMembers }: { currentUserId: string; initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: userData, error: userErr } = await supabase
      .from('workspace_members')
      .select('id')
      .limit(1)

    if (userErr) { setError('Failed to invite user.'); setSaving(false); return }

    const { error: signUpErr } = await supabase.auth.admin?.createUser
      ? { error: null }
      : { error: null }

    setError('To add team members, create their account in Supabase Authentication → Users, then they can log in.')
    setSaving(false)
    setShowForm(false)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex justify-end mb-5">
        <button onClick={() => setShowForm(s => !s)} className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm" style={{ background: '#14b8a6' }}>
          + Add member
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-5 mb-6" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <h2 className="font-semibold text-base mb-3" style={{ color: '#0f172a' }}>Add team member</h2>
          <div className="rounded-lg p-4 text-sm" style={{ background: '#f0fdfa', color: '#0f172a' }}>
            <p className="font-medium mb-1" style={{ color: '#14b8a6' }}>How to add a member:</p>
            <ol className="list-decimal list-inside space-y-1" style={{ color: '#475569' }}>
              <li>Go to your <strong>Supabase dashboard</strong></li>
              <li>Click <strong>Authentication → Users</strong></li>
              <li>Click <strong>Invite user</strong> and enter their email</li>
              <li>They'll receive an email to set their password and can then log in here</li>
            </ol>
          </div>
          <button onClick={() => setShowForm(false)} className="mt-4 px-5 py-2 rounded-lg text-sm border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>Close</button>
        </div>
      )}

      {error && <div className="mb-4 text-sm p-3 rounded-lg" style={{ background: '#fef2f2', color: '#ef4444' }}>{error}</div>}

      {members.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No team members yet.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {members.map((member, i) => {
            const email = member.user?.email ?? 'Unknown'
            const initials = email.slice(0, 2).toUpperCase()
            const isYou = member.user_id === currentUserId
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4" style={{ background: 'white', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#14b8a6' }}>
                  {initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{email}</p>
                  {isYou && <p className="text-xs" style={{ color: '#94a3b8' }}>You</p>}
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full capitalize" style={{
                  background: member.role === 'owner' ? '#fef3c7' : member.role === 'admin' ? '#ede9fe' : '#f1f5f9',
                  color: member.role === 'owner' ? '#92400e' : member.role === 'admin' ? '#5b21b6' : '#475569'
                }}>
                  {member.role}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
