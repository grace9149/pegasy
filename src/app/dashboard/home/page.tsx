import { createClient } from '@/lib/supabase-server'
import DashboardHome from '@/components/DashboardHome'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: todayEntries },
    { data: weekEntries },
    { data: monthEntries },
    { data: recentEntries },
    { data: projects },
    { data: runningEntry },
  ] = await Promise.all([
    supabase.from('time_entries').select('duration, billable').eq('user_id', user!.id).not('end_time', 'is', null).gte('start_time', todayStart),
    supabase.from('time_entries').select('duration, billable, project_id').eq('user_id', user!.id).not('end_time', 'is', null).gte('start_time', weekStart.toISOString()),
    supabase.from('time_entries').select('duration, billable').eq('user_id', user!.id).not('end_time', 'is', null).gte('start_time', monthStart),
    supabase.from('time_entries').select('*, projects(name, color)').eq('user_id', user!.id).not('end_time', 'is', null).order('start_time', { ascending: false }).limit(5),
    supabase.from('projects').select('id, name, color, hourly_rate').eq('archived', false).order('name'),
    supabase.from('time_entries').select('*, projects(name, color)').eq('user_id', user!.id).is('end_time', null).maybeSingle(),
  ])

  // Top projects by hours this week
  const projectSeconds: Record<string, number> = {}
  weekEntries?.forEach(e => {
    if (e.project_id) projectSeconds[e.project_id] = (projectSeconds[e.project_id] ?? 0) + (e.duration ?? 0)
  })
  const topProjects = (projects ?? [])
    .map(p => ({ ...p, seconds: projectSeconds[p.id] ?? 0 }))
    .filter(p => p.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5)

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Dashboard</h1>
      </div>
      <div className="p-6">
        <DashboardHome
          userId={user!.id}
          userEmail={user!.email ?? ''}
          todaySeconds={(todayEntries ?? []).reduce((s, e) => s + (e.duration ?? 0), 0)}
          weekSeconds={(weekEntries ?? []).reduce((s, e) => s + (e.duration ?? 0), 0)}
          monthSeconds={(monthEntries ?? []).reduce((s, e) => s + (e.duration ?? 0), 0)}
          billableWeekSeconds={(weekEntries ?? []).filter(e => e.billable).reduce((s, e) => s + (e.duration ?? 0), 0)}
          recentEntries={recentEntries ?? []}
          topProjects={topProjects}
          runningEntry={runningEntry ?? null}
        />
      </div>
    </div>
  )
}
