import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Settings,
  ScrollText,
  BarChart3,
  LogOut,
  Menu,
  Moon,
  Sun,
  ClipboardCheck,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/shared/AppLogo'
import { usersService } from '@/services/users.service'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navByRole: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'hospitals', href: '/admin/hospitals', icon: Building2 },
    { label: 'civilCentersNav', href: '/admin/civil-centers', icon: Building2 },
    { label: 'users', href: '/admin/users', icon: Users },
    { label: 'reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'auditLogs', href: '/admin/audit-logs', icon: ScrollText },
    { label: 'settings', href: '/admin/settings', icon: Settings },
  ],
  hospital: [
    { label: 'dashboard', href: '/hospital/dashboard', icon: LayoutDashboard },
    { label: 'declarations', href: '/hospital/declarations', icon: FileText },
  ],
  civil_officer: [
    { label: 'dashboard', href: '/civil/dashboard', icon: LayoutDashboard },
    { label: 'incomingDeclarations', href: '/civil/declarations', icon: FileText },
    { label: 'verificationQueue', href: '/civil/verification', icon: ClipboardCheck },
  ],
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation()
  const { profile, signOut, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const ns = profile?.role === 'super_admin' ? 'admin' : profile?.role === 'hospital' ? 'hospital' : 'civil'
  const navItems = profile ? navByRole[profile.role] : []
  const homePath = navItems[0]?.href ?? '/'

  const toggleLanguage = async () => {
    const next = i18n.language === 'en' ? 'fr' : 'en'
    await i18n.changeLanguage(next)
    localStorage.setItem('ebirth-locale', next)

    if (profile?.id) {
      try {
        await usersService.update(profile.id, { locale: next })
        await refreshProfile()
      } catch {
        // localStorage still holds the browser preference
      }
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — full width, single professional header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-border/80 bg-background/95 px-4 backdrop-blur-md lg:px-6">
        <div className="flex w-full items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to={homePath} className="flex shrink-0 items-center gap-3">
            <AppLogo variant="header" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">{t('common:appName')}</p>
              <p className="text-[11px] text-muted-foreground">{t('common:tagline')}</p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="h-8 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              {i18n.language === 'en' ? 'FR' : 'EN'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar navigation */}
      <aside
        className={cn(
          'fixed bottom-0 left-0 top-14 z-40 flex w-64 flex-col border-r border-border/80 bg-card transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <nav className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                  {t(`${ns}:${item.label}`)}
                </Link>
              )
            })}
          </div>
        </nav>

        {profile && (
          <div className="border-t border-border/80 p-3">
            <Link
              to="/profile"
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-muted/80',
                location.pathname === '/profile' && 'bg-primary/10'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(profile.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight text-foreground">
                  {profile.full_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t(`admin:roles.${profile.role}`)}
                </p>
              </div>
            </Link>
          </div>
        )}
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 top-14 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Main content */}
      <div className="flex min-h-screen flex-col pt-14 lg:pl-64">
        <main className="flex-1 p-3 lg:p-5">{children}</main>
      </div>
    </div>
  )
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary/80 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative flex max-w-sm flex-col items-center text-center text-primary-foreground">
          <div className="rounded-2xl border border-white/20 bg-white px-6 py-5 shadow-2xl">
            <AppLogo variant="auth" className="max-w-[260px]" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
