import { createFileRoute } from '@tanstack/react-router'
import { PlatformSettingsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/platform-settings/')({
  component: PlatformSettingsPage,
})
