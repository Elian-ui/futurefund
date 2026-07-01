import { createFileRoute, redirect } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { auth } = useAuthStore.getState()

    if (!auth.accessToken) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    try {
      const { data } = await api.get('/admin/me')
      const roles = data.roles ?? []

      if (
        !roles.includes('support') &&
        !roles.includes('admin') &&
        !roles.includes('superadmin')
      ) {
        auth.reset()
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      }

      auth.setUser({
        id: data.userId,
        name: data.name,
        email: data.email,
        role: roles,
          exp: Date.now() + 24 * 60 * 60 * 1000,
      })

      const isSupportOnly =
        roles.includes('support') &&
        !roles.includes('admin') &&
        !roles.includes('superadmin')

      if (isSupportOnly && location.pathname !== '/support') {
        throw redirect({ to: '/support' })
      }
    } catch (error) {
      auth.reset()
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
