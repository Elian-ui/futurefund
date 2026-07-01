import { createFileRoute } from '@tanstack/react-router'
import { DepositsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/deposits/')({
  component: DepositsPage,
})
