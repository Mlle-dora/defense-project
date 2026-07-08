import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileError } from '@/components/shared/ProfileError'
import type { UserRole } from '@/types'

export function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <ProfileError />
  if (!roles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function GuestOnly() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (user && profile) return <Navigate to="/" replace />
  return <Outlet />
}
