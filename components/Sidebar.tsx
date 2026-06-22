'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { AppUser } from '@/lib/types'

interface SidebarProps {
  user: AppUser
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/clients', label: 'My Clients', icon: '👥' },
    { href: '/profile', label: 'My Profile', icon: '👤' },
    ...(user.role === 'admin' ? [
      { href: '/admin', label: 'Manage Coaches', icon: '⚙️' },
    ] : []),
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside className="w-56 min-h-screen flex flex-col border-r" style={{ background: 'var(--navy)', borderColor: '#2a4a7f' }}>
      {/* Logo area */}
      <div className="px-4 py-3 border-b" style={{ background: 'white', borderColor: '#e5e7eb' }}>
        <Image src="/agl-logo.png" alt="AGL Coaching" width={160} height={72} style={{ width: '100%', height: 'auto' }} priority />
        <div className="text-xs mt-1.5 font-medium text-center" style={{ color: '#1F3864' }}>Habit Builder</div>
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
        <Link href="/profile" className="flex items-center gap-3 mb-3 group">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#2a4a7f' }}>
            {user.photo_url ? (
              <Image
                src={user.photo_url}
                alt={user.first_name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xs text-white font-semibold">
                {user.first_name[0]}{user.last_name[0]}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white font-medium truncate group-hover:underline">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-xs truncate" style={{ color: '#93b4d4' }}>{user.email}</div>
          </div>
        </Link>
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
