import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth, RequireRole, GuestOnly } from '@/app/guards'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout, AuthLayout } from '@/layouts/AppLayout'
import { getRoleDashboardPath } from '@/utils/declaration'
import { Skeleton } from '@/components/ui/skeleton'

import { ProfileError } from '@/components/shared/ProfileError'

import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { ProfilePage } from '@/pages/ProfilePage'

import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { HospitalsPage } from '@/pages/admin/HospitalsPage'
import { CivilCentersPage } from '@/pages/admin/CivilCentersPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'

import { HospitalDashboardPage } from '@/pages/hospital/HospitalDashboardPage'
import { HospitalDeclarationsPage } from '@/pages/hospital/HospitalDeclarationsPage'
import { NewDeclarationPage } from '@/pages/hospital/NewDeclarationPage'
import { DeclarationDetailPage } from '@/pages/hospital/DeclarationDetailPage'

import { CivilDashboardPage } from '@/pages/civil/CivilDashboardPage'
import { CivilDeclarationsPage } from '@/pages/civil/CivilDeclarationsPage'
import { CivilDeclarationDetailPage } from '@/pages/civil/CivilDeclarationDetailPage'
import { VerificationPage } from '@/pages/civil/VerificationPage'

function RoleRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Skeleton className="h-8 w-48 m-8" />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <ProfileError />
  return <Navigate to={getRoleDashboardPath(profile.role)} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route element={<AuthLayout><LoginPage /></AuthLayout>} path="/login" />
          <Route element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} path="/forgot-password" />
          <Route element={<AuthLayout><ResetPasswordPage /></AuthLayout>} path="/reset-password" />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/" element={<RoleRedirect />} />
          <Route element={<AppLayout><ProfilePage /></AppLayout>} path="/profile" />

          <Route element={<RequireRole roles={['super_admin']} />}>
            <Route element={<AppLayout><AdminDashboardPage /></AppLayout>} path="/admin/dashboard" />
            <Route element={<AppLayout><HospitalsPage /></AppLayout>} path="/admin/hospitals" />
            <Route element={<AppLayout><CivilCentersPage /></AppLayout>} path="/admin/civil-centers" />
            <Route element={<AppLayout><UsersPage /></AppLayout>} path="/admin/users" />
            <Route element={<AppLayout><SettingsPage /></AppLayout>} path="/admin/settings" />
            <Route element={<AppLayout><AuditLogsPage /></AppLayout>} path="/admin/audit-logs" />
            <Route element={<AppLayout><ReportsPage /></AppLayout>} path="/admin/reports" />
          </Route>

          <Route element={<RequireRole roles={['hospital']} />}>
            <Route element={<AppLayout><HospitalDashboardPage /></AppLayout>} path="/hospital/dashboard" />
            <Route element={<AppLayout><HospitalDeclarationsPage /></AppLayout>} path="/hospital/declarations" />
            <Route element={<AppLayout><NewDeclarationPage /></AppLayout>} path="/hospital/declarations/new" />
            <Route element={<AppLayout><DeclarationDetailPage /></AppLayout>} path="/hospital/declarations/:id" />
            <Route element={<AppLayout><NewDeclarationPage /></AppLayout>} path="/hospital/declarations/:id/edit" />
          </Route>

          <Route element={<RequireRole roles={['civil_officer']} />}>
            <Route element={<AppLayout><CivilDashboardPage /></AppLayout>} path="/civil/dashboard" />
            <Route element={<AppLayout><CivilDeclarationsPage /></AppLayout>} path="/civil/declarations" />
            <Route element={<AppLayout><CivilDeclarationDetailPage /></AppLayout>} path="/civil/declarations/:id" />
            <Route element={<AppLayout><VerificationPage /></AppLayout>} path="/civil/verification" />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
