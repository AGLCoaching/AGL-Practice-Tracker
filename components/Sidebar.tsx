'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AppUser } from '@/lib/types'

interface SidebarProps {
  user: AppUser
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/clients', label: 'My Clients', icon: '👥' },
    ...(user.role === 'admin' ? [
      { href: '/admin', label: 'Manage Coaches', icon: '⚙️' },
    ] : []),
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside className="w-56 min-h-screen flex flex-col border-r" style={{ background: 'var(--navy)', borderColor: '#2a4a7f' }}>
      {/* Logo area */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#2a4a7f' }}>
        <div className="text-white font-bold text-base leading-tight">AGL Practice</div>
        <div className="text-xs mt-0.5" style={{ color: '#93b4d4' }}>Tracker</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="px-4 py-4 border-t" style={{ borderColor: '#2a4a7f' }}>
        <div className="text-xs mb-1" style={{ color: '#93b4d4' }}>Signed in as</div>
        <div className="text-sm text-white font-medium truncate">{user.first_name} {user.last_name}</div>
        <div className="text-xs mt-0.5 mb-3 truncate" style={{ color: '#93b4d4' }}>{user.email}</div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
