import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/analytics/')({
  component: AnalyticsPage,
})
