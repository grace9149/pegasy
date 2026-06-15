import { createClient } from '@/lib/supabase-server'
import ReportsClient from '@/components/ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*, projects(name, color)')
    .eq('user_id', user!.id)
    .not('end_time', 'is', null)
    .order('start_time', { ascending: false })

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .order('name')

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Reports</h1>
      </div>
      <div className="p-6">
        <ReportsClient entries={entries ?? []} projects={projects ?? []} />
      </div>
    </div>
  )
}
