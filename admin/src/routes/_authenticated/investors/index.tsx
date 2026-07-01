import { createFileRoute } from '@tanstack/react-router'
import { InvestorsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/investors/')({
  component: InvestorsPage,
})
