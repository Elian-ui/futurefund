import { createFileRoute } from '@tanstack/react-router'
import { InvestorsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/users/')({
  component: InvestorsPage,
})
