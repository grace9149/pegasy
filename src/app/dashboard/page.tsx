
import { createClient } from '@/lib/supabase-server'
import TimeTracker from '@/components/TimeTracker'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('*, projects(name, color)')
    .eq('user_id', user!.id)
    .not('end_time', 'is', null)
    .order('start_time', { ascending: false })
    .limit(50)

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .order('name')

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Time tracker</h1>
      </div>
      <div className="p-6 max-w-4xl">
        <TimeTracker
          userId={user!.id}
          initialEntries={timeEntries ?? []}
          projects={projects ?? []}
        />
      </div>
    </div>
  )
}
