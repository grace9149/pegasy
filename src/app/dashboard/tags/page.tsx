
import { createClient } from '@/lib/supabase-server'
import TagsClient from '@/components/TagsClient'

export default async function TagsPage() {
  const supabase = await createClient()
  const { data: tags } = await supabase.from('tags').select('*').order('name')

  return (
    <div>
      <div className="border-b px-6 py-4" style={{ background: 'white', borderColor: '#e2e8f0' }}>
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Tags</h1>
      </div>
      <div className="p-6">
        <TagsClient initialTags={tags ?? []} />
      </div>
    </div>
  )
}
