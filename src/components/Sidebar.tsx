'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const nav = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard/home', icon: 'ti-layout-dashboard' },
    ],
  },
  {
    section: 'Track',
    items: [
      { label: 'Time Tracker', href: '/dashboard', icon: 'ti-clock' },
      { label: 'Projects', href: '/dashboard/projects', icon: 'ti-folder' },
      { label: 'Clients', href: '/dashboard/clients', icon: 'ti-building' },
    ],
  },
  {
    section: 'Analyze',
    items: [
      { label: 'Reports', href: '/dashboard/reports', icon: 'ti-chart-bar' },
      { label: 'Invoices', href: '/dashboard/invoices', icon: 'ti-file-invoice' },
    ],
  },
  {
    section: 'Manage',
    items: [
      { label: 'Team', href: '/dashboard/team', icon: 'ti-users' },
      { label: 'Time Off', href: '/dashboard/time-off', icon: 'ti-beach' },
      { label: 'Tags', href: '/dashboard/tags', icon: 'ti-tag' },
    ],
  },
]

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: '#0f172a' }}>
      {/* Logo */}
      <div className="border-b" style={{ borderColor: '#1e293b' }}>
        <Image src="/logo.png" alt="Trackify" width={240} height={200} className="w-full object-cover" style={{ height: '200px' }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {nav.map(group => (
          <div key={group.section} className="mb-4">
            <div className="px-3 mb-2 font-semibold uppercase tracking-widest" style={{ color: '#475569', fontSize: '12px' }}>
              {group.section}
            </div>
            {group.items.map(item => {
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg mb-0.5 transition-colors font-medium"
                  style={{
                    color: active ? '#14b8a6' : '#94a3b8',
                    background: active ? '#1e293b' : 'transparent',
                    fontSize: '16px',
                  }}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" style={{ fontSize: '20px' }} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t" style={{ borderColor: '#1e293b' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1" style={{ background: '#1e293b' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: '#14b8a6', fontSize: '12px' }}>
            {initials}
          </div>
          <span className="truncate" style={{ color: '#94a3b8', fontSize: '15px' }}>{user.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium"
          style={{ color: '#64748b', fontSize: '16px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: '17px' }} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
