export const runtime = 'edge'

import { createClient } from '@/lib/supabase-server'
import ClientsClient from '@/components/ClientsClient'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('*').order('name')

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Clients</h1>
      </div>
      <div className="p-6">
        <ClientsClient initialClients={clients ?? []} />
      </div>
    </div>
  )
}
