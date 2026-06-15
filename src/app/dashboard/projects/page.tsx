import { createClient } from '@/lib/supabase-server'
import ProjectsClient from '@/components/ProjectsClient'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .order('name')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name')

  // Fetch all completed time entries with project_id so client can compute per-project totals
  const { data: entries } = await supabase
    .from('time_entries')
    .select('project_id, duration, billable')
    .not('end_time', 'is', null)
    .not('project_id', 'is', null)

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Projects</h1>
      </div>
      <div className="p-6">
        <ProjectsClient
          initialProjects={projects ?? []}
          clients={clients ?? []}
          allEntries={entries ?? []}
        />
      </div>
    </div>
  )
}
