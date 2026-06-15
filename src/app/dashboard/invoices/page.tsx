import { createClient } from '@/lib/supabase-server'
import InvoicesClient from '@/components/InvoicesClient'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: clients }, { data: projects }, { data: entries }] = await Promise.all([
    supabase.from('clients').select('id, name, email, address, currency').eq('archived', false).order('name'),
    supabase.from('projects').select('id, name, color, hourly_rate, client_id').eq('archived', false).order('name'),
    supabase.from('time_entries')
      .select('*, projects(id, name, color, hourly_rate)')
      .eq('user_id', user!.id)
      .eq('billable', true)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false }),
  ])

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Invoices</h1>
      </div>
      <div className="p-6">
        <InvoicesClient
          clients={clients ?? []}
          projects={projects ?? []}
          entries={entries ?? []}
          userEmail={user!.email ?? ''}
        />
      </div>
    </div>
  )
}
