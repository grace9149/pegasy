export const runtime = 'edge'

// Time Off page
import { createClient } from '@/lib/supabase-server'
import TimeOffClient from '@/components/TimeOffClient'

export default async function TimeOffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: requests }, { data: policies }, { data: allBalances }, { data: members }, { data: myMembership }] = await Promise.all([
    supabase
      .from('time_off_requests')
      .select('*, policy:policy_id(name, color), requester:user_id(email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('time_off_policies')
      .select('*')
      .order('name'),
    supabase
      .from('time_off_balances')
      .select('*, policy:policy_id(name, color, days_per_year)'),
    supabase
      .from('workspace_members')
      .select('user_id, role')
      .order('created_at'),
    supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', user!.id)
      .single(),
  ])

  // Admin if owner/admin role, or if no workspace members exist yet (first user)
  const isAdmin = !myMembership || ['owner', 'admin'].includes(myMembership.role ?? '') || (members?.length ?? 0) === 0

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Time Off</h1>
      </div>
      <div className="p-6">
        <TimeOffClient
          currentUserId={user!.id}
          currentUserEmail={user!.email ?? ''}
          isAdmin={isAdmin}
          initialRequests={requests ?? []}
          initialPolicies={policies ?? []}
          allBalances={allBalances ?? []}
          members={(members ?? []).map(m => ({ user_id: m.user_id, role: m.role }))}
        />
      </div>
    </div>
  )
}
