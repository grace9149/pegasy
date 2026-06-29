
import { createClient } from '@/lib/supabase-server'
import TeamClient from '@/components/TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: members } = await supabase
    .from('workspace_members')
    .select('*, user:user_id(email)')
    .order('created_at')

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Team</h1>
      </div>
      <div className="p-6">
        <TeamClient currentUserId={user!.id} initialMembers={members ?? []} />
      </div>
    </div>
  )
}
