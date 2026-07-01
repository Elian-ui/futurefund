import { createFileRoute } from '@tanstack/react-router'
import { InvestmentsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/investments/')({
  component: InvestmentsPage,
})
